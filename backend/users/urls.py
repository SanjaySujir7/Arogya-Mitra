from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register_view, name='register'),
    path('login/', views.CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', views.user_profile_view, name='user-profile'),
    path('profile/health/', views.update_health_profile_view, name='update-health-profile'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('health-logs/', views.health_log_list_create_view, name='health-log-list-create'),
    path('health-logs/<int:log_id>/', views.health_log_detail_update_delete_view, name='health-log-detail'),
    path('goals/', views.health_goal_list_create_view, name='health-goal-list-create'),
    path('goals/<int:goal_id>/', views.health_goal_detail_update_delete_view, name='health-goal-detail'),
    path('goals/<int:goal_id>/progress/', views.goal_progress_create_view, name='goal-progress-create'),
    path('daily-checkin/today/', views.daily_checkin_today_view, name='daily-checkin-today'),
    path('daily-checkin/', views.daily_checkin_create_view, name='daily-checkin-create'),
    path('reports/', views.reports_view, name='reports'),
    path('reports/download-pdf/', views.download_report_pdf_view, name='download-report-pdf'),
    path('password-reset/request/', views.request_password_reset, name='password-reset-request'),
    path('password-reset/verify-otp/', views.verify_password_reset_otp, name='password-reset-verify-otp'),
    path('password-reset/confirm/', views.reset_password_with_token, name='password-reset-confirm'),
]

