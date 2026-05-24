from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Custom manager for User model where email is the unique identifier."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if not extra_fields.get('is_staff'):
            raise ValueError('Superuser must have is_staff=True.')
        if not extra_fields.get('is_superuser'):
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255, unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class UserProfile(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    CHOLESTEROL_CHOICES = [
        (1, 'Normal'),
        (2, 'Above Normal'),
        (3, 'High'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='health_profile')
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    blood_group = models.CharField(max_length=5, blank=True, null=True)
    is_pregnant = models.BooleanField(default=False)
    
    # Lifestyle tracking
    smoke = models.BooleanField(default=False)
    alco = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    cholesterol = models.IntegerField(choices=CHOLESTEROL_CHOICES, default=1)

    current_health_score = models.IntegerField(default=100)
    current_risk_level = models.CharField(max_length=50, default="Low")

    class Meta:
        db_table = 'user_profiles'

    def __str__(self):
        return f"Profile of {self.user.email}"


class HealthLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_logs')
    date = models.DateField()
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    systolic_bp = models.IntegerField(null=True, blank=True)
    diastolic_bp = models.IntegerField(null=True, blank=True)
    heart_rate_bpm = models.IntegerField(null=True, blank=True)
    blood_sugar_mg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    sleep_hours = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    water_intake_liters = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    step_count = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'health_logs'
        ordering = ['-date']
        unique_together = ('user', 'date')

    def __str__(self):
        return f"Log for {self.user.email} on {self.date}"


class HealthGoal(models.Model):
    METRIC_CHOICES = [
        ('step_count', 'Step Count'),
        ('water_intake', 'Water Intake (Liters)'),
        ('sleep_hours', 'Sleep (Hours)'),
        ('weight_kg', 'Weight (kg)'),
        ('custom', 'Custom'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_goals')
    title = models.CharField(max_length=255)
    metric_type = models.CharField(max_length=50, choices=METRIC_CHOICES, default='custom')
    target_value = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=50, default='blue')  # e.g. blue, green, purple, amber
    icon = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'health_goals'
        ordering = ['-created_at']


class GoalProgress(models.Model):
    goal = models.ForeignKey(HealthGoal, on_delete=models.CASCADE, related_name='progress_logs')
    date = models.DateField()
    current_value = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'goal_progress'
        unique_together = ('goal', 'date')
        ordering = ['-date']


class DailyCheckIn(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_checkins')
    date = models.DateField(auto_now_add=True)
    mood = models.IntegerField(choices=[(1, 'Terrible'), (2, 'Bad'), (3, 'Okay'), (4, 'Good'), (5, 'Great')])
    sleep_quality = models.IntegerField(choices=[(1, 'Terrible'), (2, 'Bad'), (3, 'Okay'), (4, 'Good'), (5, 'Great')])
    diet_quality = models.CharField(max_length=20, choices=[('Poor', 'Poor'), ('Average', 'Average'), ('Great', 'Great')])
    water_goal = models.BooleanField(default=False)
    exercise_goal = models.BooleanField(default=False)
    symptoms = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'daily_checkins'
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Check-in for {self.user.email} on {self.date}"
