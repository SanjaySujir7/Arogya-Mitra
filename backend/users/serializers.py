from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password as django_validate_password
from .models import User, UserProfile, HealthLog, HealthGoal, GoalProgress, DailyCheckIn


class UserProfileSerializer(serializers.ModelSerializer):
    """Reusable serializer for user profile data."""
    health_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'date_of_birth', 'health_profile']
        read_only_fields = fields

    def get_health_profile(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return HealthProfileSerializer(profile).data


class HealthProfileSerializer(serializers.ModelSerializer):
    """Serializer for the user's health profile (static body data)."""

    class Meta:
        model = UserProfile
        fields = ['gender', 'height_cm', 'blood_group', 'is_pregnant', 'smoke', 'alco', 'active', 'cholesterol', 'current_health_score', 'current_risk_level']
        read_only_fields = ['current_health_score', 'current_risk_level']


class HealthLogSerializer(serializers.ModelSerializer):
    """Serializer for individual health log entries."""
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = HealthLog
        fields = [
            'id', 'user', 'date', 'weight_kg', 'systolic_bp', 'diastolic_bp',
            'heart_rate_bpm', 'blood_sugar_mg', 'sleep_hours',
            'water_intake_liters', 'step_count',
        ]

    def validate_date(self, value):
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError("Date cannot be in the future.")
        return value


class HealthLogCreateSerializer(HealthLogSerializer):
    """Serializer for creating a new health log with per-user date uniqueness."""

    def validate_date(self, value):
        value = super().validate_date(value)
        request = self.context.get('request')
        if request and HealthLog.objects.filter(user=request.user, date=value).exists():
            raise serializers.ValidationError("A health log already exists for this date.")
        return value


class GoalProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalProgress
        fields = ['id', 'goal', 'date', 'current_value']
        read_only_fields = ['id']


class DailyCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyCheckIn
        fields = ['id', 'date', 'mood', 'sleep_quality', 'diet_quality', 'water_goal', 'exercise_goal', 'symptoms']
        read_only_fields = ['id', 'date']


class HealthGoalSerializer(serializers.ModelSerializer):
    today_progress = serializers.SerializerMethodField()

    class Meta:
        model = HealthGoal
        fields = [
            'id', 'user', 'title', 'metric_type', 'target_value', 'unit',
            'color', 'icon', 'is_active', 'created_at', 'today_progress'
        ]
        read_only_fields = ['user', 'created_at', 'today_progress']

    def get_today_progress(self, obj):
        import datetime
        today = datetime.date.today()
        
        progress = GoalProgress.objects.filter(goal=obj, date=today).first()
        if progress:
            return progress.current_value
        return 0


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'password', 'date_of_birth']

    def validate_password(self, value):
        django_validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        
        # Create default goals for the new user
        HealthGoal.objects.create(
            user=user, title='Daily Steps', metric_type='step_count',
            target_value=10000, unit='steps', color='green'
        )
        HealthGoal.objects.create(
            user=user, title='Water Intake', metric_type='water_intake',
            target_value=2.5, unit='L', color='blue'
        )
        HealthGoal.objects.create(
            user=user, title='Target Sleep', metric_type='sleep_hours',
            target_value=8.0, unit='hours', color='purple'
        )
        
        return user


from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Add extra responses here
        data['user'] = UserProfileSerializer(self.user).data
        data['message'] = "Login successful."
        
        # Rename access to access_token to match old API response
        data['access_token'] = data.pop('access')
        data['refresh_token'] = data.pop('refresh')
        
        return data
