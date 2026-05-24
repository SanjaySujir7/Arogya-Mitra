import os
import numpy as np
import joblib
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import DiabetesPredictionInputSerializer
from .utils import get_user_prediction_defaults
from .models import PredictionHistory

# Load ML model and scaler once at module level for performance
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
_diabetes_model = joblib.load(os.path.join(MODEL_DIR, 'diabetes_rf_model.pkl'))
_diabetes_scaler = joblib.load(os.path.join(MODEL_DIR, 'diabetes_scaler.pkl'))

_heart_model = joblib.load(os.path.join(MODEL_DIR, 'heart_rf_model.pkl'))
_heart_scaler = joblib.load(os.path.join(MODEL_DIR, 'heart_scaler.pkl'))

# Feature names in the order the model was trained on
FEATURE_ORDER = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def prediction_defaults_view(request):
    """Return auto-filled prediction form values from the user's health data."""
    defaults = get_user_prediction_defaults(request.user)
    return Response(defaults, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def diabetes_predict_view(request):
    """Accept 8 patient features and return diabetes risk prediction."""
    serializer = DiabetesPredictionInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Build feature array in the exact order the model expects
    features = np.array([[
        data['pregnancies'],
        data['glucose'],
        data['blood_pressure'],
        data['skin_thickness'],
        data['insulin'],
        data['bmi'],
        data['diabetes_pedigree'],
        data['age'],
    ]])

    # Scale and predict
    features_scaled = _diabetes_scaler.transform(features)
    prediction = _diabetes_model.predict(features_scaled)[0]
    probabilities = _diabetes_model.predict_proba(features_scaled)[0]

    # Get feature importances for risk factor breakdown
    importances = _diabetes_model.feature_importances_
    feature_labels = [
        'Pregnancies', 'Glucose', 'Blood Pressure', 'Skin Thickness',
        'Insulin', 'BMI', 'Family History', 'Age'
    ]
    input_values = features[0]

    # Build risk factors sorted by importance
    risk_factors = []
    for i, (label, importance, value) in enumerate(
        sorted(zip(feature_labels, importances, input_values),
               key=lambda x: x[1], reverse=True)
    ):
        risk_factors.append({
            'factor': label,
            'importance': round(float(importance) * 100, 1),
            'value': round(float(value), 2),
        })

    risk_level = 'High Risk' if prediction == 1 else 'Low Risk'
    confidence = round(float(max(probabilities)) * 100, 1)
    diabetes_probability = round(float(probabilities[1]) * 100, 1)

    # Update user profile risk level
    from users.models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    profile.current_risk_level = 'High' if prediction == 1 else 'Low'
    profile.save()

    result_data = {
        'prediction': risk_level,
        'confidence': confidence,
        'diabetes_probability': diabetes_probability,
        'risk_factors': risk_factors[:5],
    }

    # Save to prediction history
    PredictionHistory.objects.create(
        user=request.user,
        prediction_type='diabetes',
        prediction=risk_level,
        confidence=confidence,
        diabetes_probability=diabetes_probability,
        input_data=data,
        risk_factors=risk_factors[:5],
    )

    return Response(result_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def heart_disease_predict_view(request):
    """Accept 11 patient features and return heart disease risk prediction."""
    from .serializers import HeartDiseasePredictionInputSerializer
    serializer = HeartDiseasePredictionInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Build feature array in the exact order the model expects
    features = np.array([[
        data['age'],
        data['gender'],
        data['height'],
        data['weight'],
        data['ap_hi'],
        data['ap_lo'],
        data['cholesterol'],
        data['gluc'],
        data['smoke'],
        data['alco'],
        data['active'],
    ]])

    # Scale and predict
    features_scaled = _heart_scaler.transform(features)
    prediction = _heart_model.predict(features_scaled)[0]
    probabilities = _heart_model.predict_proba(features_scaled)[0]

    # Get feature importances for risk factor breakdown
    importances = _heart_model.feature_importances_
    feature_labels = [
        'Age', 'Gender', 'Height', 'Weight', 'Systolic BP', 'Diastolic BP',
        'Cholesterol', 'Glucose', 'Smoking', 'Alcohol', 'Activity'
    ]
    input_values = features[0]

    # Build risk factors sorted by importance
    risk_factors = []
    for i, (label, importance, value) in enumerate(
        sorted(zip(feature_labels, importances, input_values),
               key=lambda x: x[1], reverse=True)
    ):
        risk_factors.append({
            'factor': label,
            'importance': round(float(importance) * 100, 1),
            'value': round(float(value), 2),
        })

    risk_level = 'High Risk' if prediction == 1 else 'Low Risk'
    confidence = round(float(max(probabilities)) * 100, 1)
    heart_disease_probability = round(float(probabilities[1]) * 100, 1)

    # Update user profile risk level
    from users.models import UserProfile
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if prediction == 1:
        profile.current_risk_level = 'High'
    elif profile.current_risk_level != 'High':
        profile.current_risk_level = 'Low'
    profile.save()

    result_data = {
        'prediction': risk_level,
        'confidence': confidence,
        'heart_disease_probability': heart_disease_probability,
        'risk_factors': risk_factors[:5],
    }

    # Save to prediction history
    PredictionHistory.objects.create(
        user=request.user,
        prediction_type='heart_disease',
        prediction=risk_level,
        confidence=confidence,
        diabetes_probability=heart_disease_probability,
        input_data=data,
        risk_factors=[rf for rf in risk_factors]
    )

    return Response(result_data, status=status.HTTP_200_OK)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def prediction_history_view(request):
    """Return or clear the user's prediction history."""
    if request.method == 'DELETE':
        PredictionHistory.objects.filter(user=request.user).delete()
        return Response({'message': 'Prediction history cleared.'}, status=status.HTTP_200_OK)

    history = PredictionHistory.objects.filter(user=request.user)[:20]
    data = []
    for entry in history:
        data.append({
            'id': entry.id,
            'prediction_type': entry.prediction_type,
            'prediction': entry.prediction,
            'confidence': entry.confidence,
            'diabetes_probability': entry.diabetes_probability,
            'input_data': entry.input_data,
            'risk_factors': entry.risk_factors,
            'created_at': entry.created_at.isoformat(),
        })
    return Response(data, status=status.HTTP_200_OK)
