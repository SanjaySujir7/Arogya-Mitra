from django.urls import path
from . import views

urlpatterns = [
    path('predict/defaults/', views.prediction_defaults_view, name='prediction-defaults'),
    path('predict/diabetes/', views.diabetes_predict_view, name='diabetes-predict'),
    path('predict/history/', views.prediction_history_view, name='prediction-history'),
]
