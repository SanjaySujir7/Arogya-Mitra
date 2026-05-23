from django.db import models
from django.conf import settings


class PredictionHistory(models.Model):
    """Stores each disease risk prediction for a user."""
    RISK_CHOICES = [
        ('High Risk', 'High Risk'),
        ('Low Risk', 'Low Risk'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='predictions'
    )
    prediction_type = models.CharField(max_length=50, default='diabetes')
    prediction = models.CharField(max_length=20, choices=RISK_CHOICES)
    confidence = models.FloatField()
    diabetes_probability = models.FloatField()
    # Store the input values as JSON for reference
    input_data = models.JSONField(default=dict)
    risk_factors = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'prediction_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.prediction_type} - {self.prediction} ({self.created_at:%Y-%m-%d})"
