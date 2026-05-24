"""Utility functions for the tracker app — auto-fill prediction defaults."""
from datetime import date
from users.models import UserProfile, HealthLog


def calculate_age(dob):
    """Calculate age from a date of birth."""
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def calculate_bmi(weight_kg, height_cm):
    """Calculate BMI from weight (kg) and height (cm)."""
    if not weight_kg or not height_cm:
        return None
    height_m = float(height_cm) / 100
    return round(float(weight_kg) / (height_m ** 2), 1)


def get_user_prediction_defaults(user):
    """
    Pull the user's latest health data to auto-fill prediction form fields.
    Returns a dict with all 8 model features (or None where data is missing).
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    
    # Get the most recent non-null log for each specific metric, strictly by calendar date
    latest_weight_log = HealthLog.objects.filter(user=user, weight_kg__isnull=False).order_by('-date').first()
    latest_glucose_log = HealthLog.objects.filter(user=user, blood_sugar_mg__isnull=False).order_by('-date').first()
    latest_bp_log = HealthLog.objects.filter(user=user, systolic_bp__isnull=False).order_by('-date').first()

    age = calculate_age(user.date_of_birth)

    # BMI: use latest recorded weight + profile height
    weight = latest_weight_log.weight_kg if latest_weight_log else None
    bmi = calculate_bmi(weight, profile.height_cm)

    # Pregnancies: derive from is_pregnant flag
    pregnancies = 1 if profile.is_pregnant else 0
    
    glucose_val = float(latest_glucose_log.blood_sugar_mg) if latest_glucose_log else None
    
    # Heart Disease Specifics
    gender_map = {'Female': 1, 'Male': 2}
    gender_val = gender_map.get(profile.gender)
    
    # Map glucose reading to categorical (1: Normal, 2: Above Normal, 3: High)
    gluc_category = 1
    if glucose_val:
        if glucose_val >= 126:
            gluc_category = 3
        elif glucose_val >= 100:
            gluc_category = 2

    ap_hi_val = latest_bp_log.systolic_bp if latest_bp_log else None
    ap_lo_val = latest_bp_log.diastolic_bp if latest_bp_log else None

    return {
        # Diabetes fields
        'pregnancies': pregnancies,
        'glucose': glucose_val,
        'blood_pressure': ap_hi_val,
        'skin_thickness': 29.0,   # dataset median default
        'insulin': 125.0,         # dataset median default
        'bmi': bmi,
        'diabetes_pedigree': 0.47,  # dataset median default
        
        # Shared fields
        'age': age,
        
        # Heart Disease fields
        'gender': gender_val,
        'height': profile.height_cm,
        'weight': weight,
        'ap_hi': ap_hi_val,
        'ap_lo': ap_lo_val,
        'cholesterol': profile.cholesterol,
        'gluc': gluc_category if glucose_val else 1, # default normal if no log
        'smoke': 1 if profile.smoke else 0,
        'alco': 1 if profile.alco else 0,
        'active': 1 if profile.active else 0,

        # Source info for the frontend UI badges
        '_sources': {
            'pregnancies': 'profile' if profile.is_pregnant else 'default',
            'glucose': 'latest_log' if glucose_val else None,
            'blood_pressure': 'latest_log' if ap_hi_val else None,
            'skin_thickness': 'default',
            'insulin': 'default',
            'bmi': 'computed' if bmi else None,
            'diabetes_pedigree': 'default',
            'age': 'computed' if age else None,
            
            'gender': 'profile' if gender_val else None,
            'height': 'profile' if profile.height_cm else None,
            'weight': 'latest_log' if weight else None,
            'ap_hi': 'latest_log' if ap_hi_val else None,
            'ap_lo': 'latest_log' if ap_lo_val else None,
            'cholesterol': 'profile',
            'gluc': 'computed' if glucose_val else 'default',
            'smoke': 'profile',
            'alco': 'profile',
            'active': 'profile',
        }
    }
