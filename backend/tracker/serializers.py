from rest_framework import serializers


class DiabetesPredictionInputSerializer(serializers.Serializer):
    """Validates input features for the diabetes prediction model."""
    pregnancies = serializers.IntegerField(min_value=0, max_value=20, default=0)
    glucose = serializers.FloatField(min_value=0, max_value=500)
    blood_pressure = serializers.FloatField(min_value=0, max_value=250)
    skin_thickness = serializers.FloatField(min_value=0, max_value=100, default=29.0)
    insulin = serializers.FloatField(min_value=0, max_value=900, default=125.0)
    bmi = serializers.FloatField(min_value=10, max_value=80)
    diabetes_pedigree = serializers.FloatField(min_value=0, max_value=2.5, default=0.47)
    age = serializers.IntegerField(min_value=1, max_value=120)

class HeartDiseasePredictionInputSerializer(serializers.Serializer):
    """Validates input features for the heart disease prediction model."""
    age = serializers.IntegerField(min_value=18, max_value=120)
    gender = serializers.IntegerField(min_value=1, max_value=2)
    height = serializers.FloatField(min_value=50, max_value=300)
    weight = serializers.FloatField(min_value=10, max_value=500)
    ap_hi = serializers.FloatField(min_value=50, max_value=300)
    ap_lo = serializers.FloatField(min_value=20, max_value=200)
    cholesterol = serializers.IntegerField(min_value=1, max_value=3)
    gluc = serializers.IntegerField(min_value=1, max_value=3)
    smoke = serializers.IntegerField(min_value=0, max_value=1)
    alco = serializers.IntegerField(min_value=0, max_value=1)
    active = serializers.IntegerField(min_value=0, max_value=1)
