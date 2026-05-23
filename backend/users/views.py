import logging
import threading

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import RegisterSerializer, UserProfileSerializer, HealthProfileSerializer, HealthLogSerializer, HealthLogCreateSerializer, CustomTokenObtainPairSerializer, HealthGoalSerializer, GoalProgressSerializer
from .utils import send_welcome_email
from .models import User, UserProfile, HealthLog, HealthGoal, GoalProgress

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
    """Update current user's health profile (e.g. height)."""
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    serializer = HealthProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
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
    latest_weight_log = HealthLog.objects.filter(user=user, weight_kg__isnull=False).first()
    bmi = None
    if profile.height_cm and latest_weight_log and latest_weight_log.weight_kg:
        height_m = float(profile.height_cm) / 100
        bmi = round(float(latest_weight_log.weight_kg) / (height_m ** 2), 1)

    return Response({
        'profile': HealthProfileSerializer(profile).data,
        'latest_log': HealthLogSerializer(latest_log).data if latest_log else None,
        'bmi': bmi,
        'bp_trend': HealthLogSerializer(bp_logs, many=True).data,
        'weight_trend': HealthLogSerializer(weight_logs, many=True).data,
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

