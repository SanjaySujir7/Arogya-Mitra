from django.core.mail import send_mail
from django.conf import settings


def send_welcome_email(user):
    """Send a welcome email to a newly registered user."""
    subject = "Welcome to Arogya Mitra! 🏥"

    # Plain-text fallback
    plain_message = (
        f"Hi {user.first_name},\n\n"
        "Welcome to Arogya Mitra — your AI-powered personal health companion!\n\n"
        "Here's what you can do:\n"
        "• Track daily health data (BP, blood sugar, heart rate, sleep & more)\n"
        "• Get automatic BMI calculation & health score\n"
        "• Visualize weekly & monthly health trends\n"
        "• Predict diabetes & heart disease risk using AI\n"
        "• Receive smart alerts for abnormal health conditions\n"
        "• Download monthly health reports\n\n"
        "Start logging your health data today and take control of your well-being!\n\n"
        "Stay healthy,\n"
        "Team Arogya Mitra"
    )

    # HTML version
    html_message = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;
                background: linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%); border-radius: 16px;
                overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f73b7, #4caf50); padding: 32px 24px;
                    text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
                🏥 Arogya Mitra
            </h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">
                AI-Based Personal Health Tracking & Risk Monitoring
            </p>
        </div>

        <!-- Body -->
        <div style="padding: 32px 24px; color: #c4c9d4;">
            <h2 style="color: #f0f2f5; margin: 0 0 16px; font-size: 20px;">
                Hi {user.first_name}, Welcome! 👋
            </h2>

            <p style="line-height: 1.6; margin: 0 0 20px; font-size: 15px;">
                Thank you for joining <strong style="color: #4ade80;">Arogya Mitra</strong> —
                your personal AI-powered health companion. We're here to help you take control
                of your health with intelligent monitoring and early risk detection.
            </p>

            <h3 style="color: #f0f2f5; margin: 0 0 12px; font-size: 16px;">
                Here's what you can do:
            </h3>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; margin-bottom: 6px; font-size: 14px; color: #c4c9d4;">
                        📊 <strong style="color: #f0f2f5;">Health Data Logging</strong> — Track BP, blood sugar,
                        heart rate, sleep, water intake & more
                    </td>
                </tr>
                <tr><td style="padding: 4px;"></td></tr>
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; font-size: 14px; color: #c4c9d4;">
                        🧮 <strong style="color: #f0f2f5;">BMI & Health Score</strong> — Automatic calculation
                        with a dynamic 0–100 health score
                    </td>
                </tr>
                <tr><td style="padding: 4px;"></td></tr>
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; font-size: 14px; color: #c4c9d4;">
                        📈 <strong style="color: #f0f2f5;">Trend Analysis</strong> — Weekly & monthly
                        graphs for weight, BP, and blood sugar
                    </td>
                </tr>
                <tr><td style="padding: 4px;"></td></tr>
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; font-size: 14px; color: #c4c9d4;">
                        🤖 <strong style="color: #f0f2f5;">AI Risk Prediction</strong> — Predict diabetes
                        & heart disease risk using machine learning
                    </td>
                </tr>
                <tr><td style="padding: 4px;"></td></tr>
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; font-size: 14px; color: #c4c9d4;">
                        ⚠️ <strong style="color: #f0f2f5;">Smart Alerts</strong> — Get notified about
                        abnormal values and health warnings
                    </td>
                </tr>
                <tr><td style="padding: 4px;"></td></tr>
                <tr>
                    <td style="padding: 10px 12px; background: rgba(255,255,255,0.03);
                               border-radius: 8px; font-size: 14px; color: #c4c9d4;">
                        📄 <strong style="color: #f0f2f5;">Health Reports</strong> — Download monthly
                        PDF reports with a complete health overview
                    </td>
                </tr>
            </table>

            <p style="line-height: 1.6; font-size: 15px; color: #8b8fa3;">
                Start logging your health data today and let Arogya Mitra guide you
                towards a healthier life!
            </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.06);
                    text-align: center;">
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
                Stay healthy 💚 — Team Arogya Mitra
            </p>
            <p style="color: #4b5063; font-size: 11px; margin: 8px 0 0;">
                This application provides predictive health insights and is not a substitute
                for professional medical advice.
            </p>
        </div>
    </div>
    """

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )

def send_password_reset_otp_email(user, otp):
    """Send an OTP email for password reset."""
    subject = "Your Arogya Mitra Password Reset OTP 🔐"

    plain_message = (
        f"Hi {user.first_name},\n\n"
        f"Your OTP for resetting your password is: {otp}\n\n"
        "This OTP is valid for 10 minutes.\n"
        "If you did not request this, please ignore this email.\n\n"
        "Stay healthy,\n"
        "Team Arogya Mitra"
    )

    html_message = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;
                background: linear-gradient(135deg, #0f1117 0%, #1a1d2e 100%); border-radius: 16px;
                overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
        <div style="background: linear-gradient(135deg, #eab308, #d97706); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">🔐 Password Reset</h1>
        </div>
        <div style="padding: 32px 24px; color: #c4c9d4;">
            <h2 style="color: #f0f2f5; margin: 0 0 16px; font-size: 20px;">Hi {user.first_name},</h2>
            <p style="line-height: 1.6; margin: 0 0 20px; font-size: 15px;">
                We received a request to reset your password. Use the OTP below to proceed:
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="background: rgba(255,255,255,0.1); border: 2px dashed #eab308; padding: 15px 30px; 
                             font-size: 32px; font-weight: bold; color: #eab308; border-radius: 8px; letter-spacing: 5px;">
                    {otp}
                </span>
            </div>
            <p style="line-height: 1.6; font-size: 14px; color: #8b8fa3; text-align: center;">
                This OTP is valid for <strong>10 minutes</strong>.<br/>
                If you didn't request a password reset, you can safely ignore this email.
            </p>
        </div>
        <div style="padding: 20px 24px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="color: #6b7280; font-size: 13px; margin: 0;">Stay healthy 💚 — Team Arogya Mitra</p>
        </div>
    </div>
    """

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )
