def generate_user_alerts(profile, latest_checkin, latest_log):
    """
    Evaluates medical and lifestyle rules to generate an array of alerts.
    Alert types: 'critical' (red), 'warning' (yellow), 'info' (blue/default)
    """
    alerts = []
    alert_id = 1

    def add_alert(type, title, message):
        nonlocal alert_id
        alerts.append({
            "id": alert_id,
            "type": type,
            "title": title,
            "message": message
        })
        alert_id += 1

    # 1. Disease Risk (Critical)
    if profile.current_risk_level == 'High':
        add_alert(
            "critical",
            "High Disease Risk",
            "Our AI prediction flagged a high risk for Diabetes or Heart Disease. Please monitor your vitals closely and consult a doctor."
        )

    # 2. Vitals from Latest Health Log
    if latest_log:
        if latest_log.systolic_bp and latest_log.diastolic_bp:
            if latest_log.systolic_bp > 130 or latest_log.diastolic_bp > 85:
                add_alert(
                    "warning",
                    "Elevated Blood Pressure",
                    f"Your last BP reading was {latest_log.systolic_bp}/{latest_log.diastolic_bp}. Consider reducing sodium intake today."
                )
        
        if latest_log.heart_rate_bpm and latest_log.heart_rate_bpm > 100:
            add_alert(
                "warning",
                "High Resting Heart Rate",
                f"Your last heart rate was {latest_log.heart_rate_bpm} BPM. Ensure you are managing stress and resting adequately."
            )

    # 3. Lifestyle from Daily Check-in
    if latest_checkin:
        if latest_checkin.sleep_quality <= 2:
            add_alert(
                "info",
                "Poor Sleep Detected",
                "You logged poor sleep recently. Prioritize winding down early tonight and aim for 7-8 hours."
            )
            
        if latest_checkin.mood <= 2:
            add_alert(
                "info",
                "Low Mood",
                "You haven't been feeling your best. Take a short 15-minute mental health break today."
            )

        if latest_checkin.diet_quality == 'Poor':
            add_alert(
                "warning",
                "Diet Check",
                "You logged a poor diet recently. Try to incorporate some fresh vegetables or lean proteins into your next meal!"
            )
            
        if not latest_checkin.water_goal:
            add_alert(
                "info",
                "Hydration Reminder",
                "You missed your water goal on your last check-in. Keep a water bottle nearby today!"
            )
            
        if not latest_checkin.exercise_goal:
            add_alert(
                "info",
                "Activity Reminder",
                "You didn't hit your exercise goal. Even a brisk 15-minute walk makes a massive difference."
            )

    # Fallback if no alerts generated
    if not alerts:
        add_alert(
            "success",
            "You're doing great!",
            "Your vitals and lifestyle habits are looking healthy. Keep up the good work!"
        )

    return alerts
