import logging
import datetime
import threading
from django.core.cache import cache
from django.utils.crypto import get_random_string

from django.db.models import Avg, Count, Q

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserProfileSerializer, HealthProfileSerializer, HealthLogSerializer, HealthLogCreateSerializer, CustomTokenObtainPairSerializer, HealthGoalSerializer, GoalProgressSerializer, DailyCheckInSerializer
from .utils import send_welcome_email, send_password_reset_otp_email
from .models import User, UserProfile, HealthLog, HealthGoal, GoalProgress, DailyCheckIn
from .alerts import generate_user_alerts
from .report_pdf import generate_health_report_pdf
from tracker.models import PredictionHistory

logger = logging.getLogger(__name__)


def _send_email_async(user):
    """Send welcome email in background thread."""
    try:
        send_welcome_email(user)
    except Exception as e:
        logger.warning(f"Failed to send welcome email to {user.email}: {e}")


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Handle user registration."""
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Send welcome email in background thread (non-blocking)
        threading.Thread(target=_send_email_async, args=(user,), daemon=True).start()

        return Response(
            {"message": "Registration successful."},
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """Return current authenticated user's profile data."""
    return Response(
        UserProfileSerializer(request.user).data,
        status=status.HTTP_200_OK,
    )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_health_profile_view(request):
    """Update current user's general and health profile (e.g. height, name)."""
    # Update base User fields if provided
    user_updated = False
    if 'first_name' in request.data:
        request.user.first_name = request.data['first_name']
        user_updated = True
    if 'last_name' in request.data:
        request.user.last_name = request.data['last_name']
        user_updated = True
    if 'date_of_birth' in request.data:
        # Only allow setting DOB if it's currently NOT set
        if not request.user.date_of_birth:
            request.user.date_of_birth = request.data['date_of_birth']
            user_updated = True

    if user_updated:
        request.user.save()

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    serializer = HealthProfileSerializer(profile, data=request.data, partial=True)
    
    # We must pop out gender if user tries to pass it AND it's already set.
    # If it's currently blank, allow them to set it.
    if 'gender' in request.data and profile.gender:
        if hasattr(request.data, '_mutable'):
            request.data._mutable = True
        if isinstance(request.data, dict) or hasattr(request.data, 'pop'):
            request.data.pop('gender', None)

    if serializer.is_valid():
        serializer.save()
        
        # If onboarding includes weight, save it to today's log
        weight = request.data.get('weight_kg')
        if weight:
            from datetime import date
            log, _ = HealthLog.objects.get_or_create(user=request.user, date=date.today())
            log.weight_kg = weight
            log.save()
            
        # Return fully updated profile
        return Response(UserProfileSerializer(request.user).data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    """Return all dashboard data for the authenticated user."""
    user = request.user

    # Auto-create health profile if it doesn't exist
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # Get the latest log for stat cards
    latest_log = HealthLog.objects.filter(user=user).first()  # ordered by -date in model Meta

    # BP trend: last 7 logs that have BP data
    bp_logs = HealthLog.objects.filter(
        user=user,
        systolic_bp__isnull=False,
        diastolic_bp__isnull=False,
    ).order_by('date')[:7]

    # Weight trend: last 6 logs that have weight data
    weight_logs = HealthLog.objects.filter(
        user=user,
        weight_kg__isnull=False,
    ).order_by('date')[:6]

    # Compute BMI if possible (using the most recent log that has a weight)
    latest_weight_log = HealthLog.objects.filter(user=user, weight_kg__isnull=False).order_by('-date').first()
    bmi = None
    if profile.height_cm and latest_weight_log and latest_weight_log.weight_kg:
        height_m = float(profile.height_cm) / 100
        bmi = round(float(latest_weight_log.weight_kg) / (height_m ** 2), 1)

    latest_hr_log = HealthLog.objects.filter(user=user, heart_rate_bpm__isnull=False).order_by('-date').first()
    latest_hr = latest_hr_log.heart_rate_bpm if latest_hr_log else None

    # Dynamic Health Score Calculation
    score = 80
    if profile.current_risk_level == 'High':
        score -= 20
        
    latest_checkin = DailyCheckIn.objects.filter(user=user).order_by('-date').first()
    if latest_checkin:
        if latest_checkin.water_goal:
            score += 5
        if latest_checkin.exercise_goal:
            score += 5
            
        if latest_checkin.diet_quality == 'Great':
            score += 5
        elif latest_checkin.diet_quality == 'Poor':
            score -= 5
            
        if latest_checkin.sleep_quality == 5:
            score += 5
        elif latest_checkin.sleep_quality == 4:
            score += 2
        elif latest_checkin.sleep_quality == 2:
            score -= 2
        elif latest_checkin.sleep_quality == 1:
            score -= 5
            
        if latest_checkin.mood == 5:
            score += 5
        elif latest_checkin.mood == 4:
            score += 2
        elif latest_checkin.mood == 2:
            score -= 2
        elif latest_checkin.mood == 1:
            score -= 5

    # Clamp score between 0 and 100
    score = max(0, min(100, score))
    if profile.current_health_score != score:
        profile.current_health_score = score
        profile.save()

    # Daily Check-in Trend
    checkin_trend_qs = DailyCheckIn.objects.filter(user=user).order_by('date')[:7]
    checkin_trend_data = DailyCheckInSerializer(checkin_trend_qs, many=True).data

    # Generate Alerts
    alerts = generate_user_alerts(profile, latest_checkin, latest_log)

    return Response({
        'profile': HealthProfileSerializer(profile).data,
        'latest_log': HealthLogSerializer(latest_log).data if latest_log else None,
        'bmi': bmi,
        'latest_hr': latest_hr,
        'bp_trend': HealthLogSerializer(bp_logs, many=True).data,
        'weight_trend': HealthLogSerializer(weight_logs, many=True).data,
        'checkin_trend': checkin_trend_data,
        'alerts': alerts,
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def health_log_list_create_view(request):
    """List all health logs (GET) or create a new one (POST)."""
    if request.method == 'GET':
        logs = HealthLog.objects.filter(user=request.user)
        limit = request.query_params.get('limit')
        if limit is not None:
            try:
                logs = logs[:int(limit)]
            except (ValueError, TypeError):
                pass
        serializer = HealthLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST
    serializer = HealthLogCreateSerializer(
        data=request.data,
        context={'request': request},
    )
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def health_log_detail_update_delete_view(request, log_id):
    """Retrieve (GET), update (PUT), or delete (DELETE) a single health log."""
    log = get_object_or_404(HealthLog, pk=log_id, user=request.user)

    if request.method == 'GET':
        serializer = HealthLogSerializer(log)
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method == 'PUT':
        serializer = HealthLogSerializer(
            log,
            data=request.data,
            context={'request': request},
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    log.delete()
    return Response(
        {"message": "Health log deleted."},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def health_goal_list_create_view(request):
    """List or create health goals."""
    if request.method == 'GET':
        goals = HealthGoal.objects.filter(user=request.user)
        serializer = HealthGoalSerializer(goals, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST
    serializer = HealthGoalSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def health_goal_detail_update_delete_view(request, goal_id):
    """Retrieve, update, or delete a single health goal."""
    goal = get_object_or_404(HealthGoal, pk=goal_id, user=request.user)

    if request.method == 'GET':
        serializer = HealthGoalSerializer(goal)
        return Response(serializer.data, status=status.HTTP_200_OK)

    if request.method == 'PUT':
        serializer = HealthGoalSerializer(
            goal,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE
    goal.delete()
    return Response(
        {"message": "Health goal deleted."},
        status=status.HTTP_204_NO_CONTENT,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def goal_progress_create_view(request, goal_id):
    """Create or update GoalProgress for a specific goal."""
    goal = get_object_or_404(HealthGoal, pk=goal_id, user=request.user)
    
    date = request.data.get('date')
    current_value = request.data.get('current_value')
    
    if not date or current_value is None:
        return Response({"error": "date and current_value are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    progress, created = GoalProgress.objects.update_or_create(
        goal=goal,
        date=date,
        defaults={'current_value': current_value}
    )
    
    serializer = GoalProgressSerializer(progress)
    status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return Response(serializer.data, status=status_code)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_checkin_today_view(request):
    """Check if the user has completed their daily check-in for today."""
    today = datetime.date.today()
    checkin = DailyCheckIn.objects.filter(user=request.user, date=today).first()
    if checkin:
        return Response({
            'completed': True,
            'data': DailyCheckInSerializer(checkin).data
        })
    return Response({'completed': False})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def daily_checkin_create_view(request):
    """Submit or update the daily check-in for today."""
    today = datetime.date.today()
    checkin = DailyCheckIn.objects.filter(user=request.user, date=today).first()
    
    serializer = DailyCheckInSerializer(checkin, data=request.data) if checkin else DailyCheckInSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK if checkin else status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_view(request):
    """Return comprehensive health report data for the authenticated user."""
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # ── Summary ──────────────────────────────────────────────────────
    latest_weight_log = (
        HealthLog.objects.filter(user=user, weight_kg__isnull=False)
        .order_by('-date')
        .first()
    )
    bmi = None
    if profile.height_cm and latest_weight_log and latest_weight_log.weight_kg:
        height_m = float(profile.height_cm) / 100
        bmi = round(float(latest_weight_log.weight_kg) / (height_m ** 2), 1)

    total_logs = HealthLog.objects.filter(user=user).count()
    total_checkins = DailyCheckIn.objects.filter(user=user).count()

    summary = {
        'health_score': profile.current_health_score,
        'risk_level': profile.current_risk_level,
        'bmi': bmi,
        'total_logs': total_logs,
        'total_checkins': total_checkins,
        'member_since': user.created_at.date().isoformat(),
    }

    # ── Prediction History (last 20) ─────────────────────────────────
    predictions_qs = PredictionHistory.objects.filter(user=user)[:20]
    prediction_history = [
        {
            'prediction_type': p.prediction_type,
            'prediction': p.prediction,
            'confidence': p.confidence,
            'diabetes_probability': p.diabetes_probability,
            'risk_factors': p.risk_factors,
            'created_at': p.created_at.isoformat(),
        }
        for p in predictions_qs
    ]

    # ── Health Trends (last 30 logs, ascending) ──────────────────────
    trend_logs = HealthLog.objects.filter(user=user).order_by('date')[:30]
    health_trends = [
        {
            'date': log.date.isoformat(),
            'systolic_bp': log.systolic_bp,
            'diastolic_bp': log.diastolic_bp,
            'heart_rate_bpm': log.heart_rate_bpm,
            'weight_kg': float(log.weight_kg) if log.weight_kg else None,
            'step_count': log.step_count,
        }
        for log in trend_logs
    ]

    # ── Check-in Summary (last 30 check-ins) ─────────────────────────
    checkins_qs = DailyCheckIn.objects.filter(user=user).order_by('-date')[:30]
    checkin_list = list(checkins_qs)
    checkin_count = len(checkin_list)

    if checkin_count:
        avg_mood = round(
            sum(c.mood for c in checkin_list) / checkin_count, 1
        )
        avg_sleep = round(
            sum(c.sleep_quality for c in checkin_list) / checkin_count, 1
        )
        water_hits = sum(1 for c in checkin_list if c.water_goal)
        exercise_hits = sum(1 for c in checkin_list if c.exercise_goal)
        water_goal_hit_pct = round(water_hits / checkin_count * 100)
        exercise_goal_hit_pct = round(exercise_hits / checkin_count * 100)
    else:
        avg_mood = None
        avg_sleep = None
        water_goal_hit_pct = 0
        exercise_goal_hit_pct = 0

    checkin_data = [
        {
            'date': c.date.isoformat(),
            'mood': c.mood,
            'sleep_quality': c.sleep_quality,
            'diet_quality': c.diet_quality,
            'water_goal': c.water_goal,
            'exercise_goal': c.exercise_goal,
            'symptoms': c.symptoms,
        }
        for c in checkin_list
    ]

    checkin_summary = {
        'avg_mood': avg_mood,
        'avg_sleep': avg_sleep,
        'water_goal_hit_pct': water_goal_hit_pct,
        'exercise_goal_hit_pct': exercise_goal_hit_pct,
        'total_checkins': checkin_count,
        'checkin_data': checkin_data,
    }

    return Response({
        'summary': summary,
        'prediction_history': prediction_history,
        'health_trends': health_trends,
        'checkin_summary': checkin_summary,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_report_pdf_view(request):
    """Generate and return a professional PDF health report."""
    from django.http import HttpResponse

    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    # Reuse the same data logic from reports_view
    latest_weight_log = (
        HealthLog.objects.filter(user=user, weight_kg__isnull=False)
        .order_by('-date')
        .first()
    )
    bmi = None
    if profile.height_cm and latest_weight_log and latest_weight_log.weight_kg:
        height_m = float(profile.height_cm) / 100
        bmi = round(float(latest_weight_log.weight_kg) / (height_m ** 2), 1)

    total_logs = HealthLog.objects.filter(user=user).count()
    total_checkins = DailyCheckIn.objects.filter(user=user).count()

    summary = {
        'health_score': profile.current_health_score,
        'risk_level': profile.current_risk_level,
        'bmi': bmi,
        'total_logs': total_logs,
        'total_checkins': total_checkins,
        'member_since': user.created_at.date().isoformat(),
    }

    predictions_qs = PredictionHistory.objects.filter(user=user)[:20]
    prediction_history = [
        {
            'prediction_type': p.prediction_type,
            'prediction': p.prediction,
            'confidence': p.confidence,
            'created_at': p.created_at.isoformat(),
        }
        for p in predictions_qs
    ]

    trend_logs = HealthLog.objects.filter(user=user).order_by('date')[:30]
    health_trends = [
        {
            'date': log.date.isoformat(),
            'systolic_bp': log.systolic_bp,
            'diastolic_bp': log.diastolic_bp,
            'heart_rate_bpm': log.heart_rate_bpm,
            'weight_kg': float(log.weight_kg) if log.weight_kg else None,
            'step_count': log.step_count,
        }
        for log in trend_logs
    ]

    checkins_qs = DailyCheckIn.objects.filter(user=user).order_by('-date')[:30]
    checkin_list = list(checkins_qs)
    checkin_count = len(checkin_list)

    if checkin_count:
        avg_mood = round(sum(c.mood for c in checkin_list) / checkin_count, 1)
        avg_sleep = round(sum(c.sleep_quality for c in checkin_list) / checkin_count, 1)
        water_pct = round(sum(1 for c in checkin_list if c.water_goal) / checkin_count * 100)
        exercise_pct = round(sum(1 for c in checkin_list if c.exercise_goal) / checkin_count * 100)
    else:
        avg_mood = None
        avg_sleep = None
        water_pct = 0
        exercise_pct = 0

    checkin_summary = {
        'avg_mood': avg_mood,
        'avg_sleep': avg_sleep,
        'water_goal_hit_pct': water_pct,
        'exercise_goal_hit_pct': exercise_pct,
        'total_checkins': checkin_count,
    }

    report_data = {
        'summary': summary,
        'prediction_history': prediction_history,
        'health_trends': health_trends,
        'checkin_summary': checkin_summary,
    }

    pdf_buffer = generate_health_report_pdf(user, report_data)

    today = datetime.date.today().isoformat()
    filename = f'Arogya-Mitra-Report-{today}.pdf'

    response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Generate and send OTP for password reset."""
    email = request.data.get('email')
    if not email:
        return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(email=email).first()
    if user:
        otp = get_random_string(length=6, allowed_chars='0123456789')
        # Store in cache for 10 minutes (600 seconds)
        cache.set(f'password_reset_otp_{email}', otp, timeout=600)
        
        # Send email asynchronously
        threading.Thread(
            target=send_password_reset_otp_email, 
            args=(user, otp), 
            daemon=True
        ).start()
        
    # Always return success to prevent email enumeration
    return Response({'message': 'If an account exists with this email, an OTP has been sent.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_otp(request):
    """Verify OTP and generate a secure reset token."""
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({'detail': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    cached_otp = cache.get(f'password_reset_otp_{email}')
    
    if not cached_otp or cached_otp != str(otp):
        return Response({'detail': 'Invalid or expired OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Generate a secure reset token
    reset_token = get_random_string(length=32)
    # Store token in cache for 5 minutes
    cache.set(f'password_reset_token_{email}', reset_token, timeout=300)
    
    # Invalidate the OTP so it can't be reused
    cache.delete(f'password_reset_otp_{email}')
    
    return Response({'reset_token': reset_token, 'message': 'OTP verified successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_with_token(request):
    """Reset password using the secure reset token."""
    email = request.data.get('email')
    reset_token = request.data.get('reset_token')
    new_password = request.data.get('new_password')
    
    if not all([email, reset_token, new_password]):
        return Response({'detail': 'Email, reset token, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    cached_token = cache.get(f'password_reset_token_{email}')
    
    if not cached_token or cached_token != reset_token:
        return Response({'detail': 'Invalid or expired reset token. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    # Update password
    user.set_password(new_password)
    user.save()
    
    # Invalidate Token
    cache.delete(f'password_reset_token_{email}')
    
    return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
