"""
Professional PDF Health Report Generator using ReportLab.
Generates a clean, branded, multi-page PDF report.
"""
import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# ── Brand Colors ──────────────────────────────────────────────
BRAND_PRIMARY = colors.HexColor('#6366f1')
BRAND_GREEN = colors.HexColor('#4ade80')
BRAND_RED = colors.HexColor('#f87171')
BRAND_AMBER = colors.HexColor('#fbbf24')
BRAND_PURPLE = colors.HexColor('#8b5cf6')
BRAND_BLUE = colors.HexColor('#60a5fa')
BRAND_DARK = colors.HexColor('#1e1e2e')
BRAND_LIGHT_BG = colors.HexColor('#f8f9fc')
BRAND_BORDER = colors.HexColor('#e2e8f0')


def _get_styles():
    """Return custom paragraph styles for the report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='ReportTitle',
        fontSize=22,
        leading=28,
        textColor=BRAND_DARK,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name='ReportSubtitle',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
        fontName='Helvetica',
        alignment=TA_CENTER,
        spaceAfter=20,
    ))
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontSize=14,
        leading=18,
        textColor=BRAND_PRIMARY,
        fontName='Helvetica-Bold',
        spaceBefore=20,
        spaceAfter=10,
    ))
    styles.add(ParagraphStyle(
        name='BodyText2',
        fontSize=10,
        leading=14,
        textColor=BRAND_DARK,
        fontName='Helvetica',
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name='SmallGray',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#94a3b8'),
        fontName='Helvetica',
    ))
    return styles


def _build_summary_table(summary):
    """Build a nicely formatted summary grid."""
    health_score = summary.get('health_score', '—')
    risk_level = summary.get('risk_level', '—')
    bmi = summary.get('bmi', '—')
    total_logs = summary.get('total_logs', 0)
    total_checkins = summary.get('total_checkins', 0)
    member_since = summary.get('member_since', '—')

    # BMI category
    bmi_cat = ''
    if isinstance(bmi, (int, float)):
        if bmi < 18.5:
            bmi_cat = 'Underweight'
        elif bmi < 25:
            bmi_cat = 'Normal'
        elif bmi < 30:
            bmi_cat = 'Overweight'
        else:
            bmi_cat = 'Obese'

    data = [
        ['Health Score', 'Risk Level', 'BMI'],
        [str(health_score) + ' / 100', str(risk_level), f'{bmi} ({bmi_cat})' if bmi_cat else str(bmi)],
        ['Health Logs', 'Daily Check-ins', 'Member Since'],
        [str(total_logs), str(total_checkins), str(member_since)],
    ]

    table = Table(data, colWidths=[170, 170, 170])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 2), (-1, 2), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
        ('TEXTCOLOR', (0, 2), (-1, 2), colors.HexColor('#64748b')),
        ('FONTSIZE', (0, 1), (-1, 1), 16),
        ('FONTSIZE', (0, 3), (-1, 3), 16),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (-1, 1), BRAND_DARK),
        ('TEXTCOLOR', (0, 3), (-1, 3), BRAND_DARK),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('ROUNDEDCORNERS', [6, 6, 6, 6]),
    ]))
    return table


def _build_predictions_table(predictions):
    """Build the prediction history table."""
    header = ['Date', 'Type', 'Result', 'Confidence']
    rows = [header]

    for p in predictions:
        created = p.get('created_at', '')
        if created:
            try:
                dt = datetime.datetime.fromisoformat(created.replace('Z', '+00:00'))
                created = dt.strftime('%b %d, %Y')
            except (ValueError, TypeError):
                pass

        pred_type = str(p.get('prediction_type', '')).replace('_', ' ').title()
        result = p.get('prediction', '—')
        confidence = p.get('confidence', 0)
        conf_str = f"{confidence * 100:.1f}%" if isinstance(confidence, (int, float)) else str(confidence)

        rows.append([created, pred_type, result, conf_str])

    table = Table(rows, colWidths=[120, 130, 120, 100])

    style_cmds = [
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_PRIMARY),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_BG]),
    ]

    # Color-code risk results
    for i, row in enumerate(rows[1:], start=1):
        if 'High' in str(row[2]):
            style_cmds.append(('TEXTCOLOR', (2, i), (2, i), BRAND_RED))
            style_cmds.append(('FONTNAME', (2, i), (2, i), 'Helvetica-Bold'))
        else:
            style_cmds.append(('TEXTCOLOR', (2, i), (2, i), BRAND_GREEN))
            style_cmds.append(('FONTNAME', (2, i), (2, i), 'Helvetica-Bold'))

    table.setStyle(TableStyle(style_cmds))
    return table


def _build_health_trends_table(trends):
    """Build a compact health trends table."""
    header = ['Date', 'BP (Sys/Dia)', 'Heart Rate', 'Weight (kg)', 'Steps']
    rows = [header]

    for t in trends:
        date = t.get('date', '—')
        bp = f"{t['systolic_bp']}/{t['diastolic_bp']}" if t.get('systolic_bp') else '—'
        hr = str(t.get('heart_rate_bpm') or '—')
        weight = str(t.get('weight_kg') or '—')
        steps = str(t.get('step_count') or '—')
        rows.append([date, bp, hr, weight, steps])

    table = Table(rows, colWidths=[90, 100, 90, 90, 90])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_PURPLE),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BRAND_LIGHT_BG]),
    ]))
    return table


def _build_checkin_summary_table(checkin_summary):
    """Build a visual check-in summary."""
    avg_mood = checkin_summary.get('avg_mood')
    avg_sleep = checkin_summary.get('avg_sleep')
    water_pct = checkin_summary.get('water_goal_hit_pct', 0)
    exercise_pct = checkin_summary.get('exercise_goal_hit_pct', 0)

    data = [
        ['Avg Mood (1-5)', 'Avg Sleep (1-5)', 'Water Goal Hit', 'Exercise Goal Hit'],
        [
            str(avg_mood) if avg_mood else '—',
            str(avg_sleep) if avg_sleep else '—',
            f'{water_pct}%',
            f'{exercise_pct}%',
        ],
    ]

    table = Table(data, colWidths=[120, 120, 120, 120])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#64748b')),
        ('FONTSIZE', (0, 1), (-1, 1), 18),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (-1, 1), BRAND_PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    return table


def generate_health_report_pdf(user, report_data):
    """
    Generate a professional multi-page PDF health report.
    Returns a BytesIO buffer containing the PDF.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title=f'Arogya Mitra Health Report - {user.first_name} {user.last_name}',
        author='Arogya Mitra',
    )

    styles = _get_styles()
    elements = []

    # ── Header ──
    logo_path = r"d:\Arogya-Mitra\frontend\public\logo-1.png"
    try:
        # 1 inch height, keep aspect ratio
        logo = Image(logo_path, width=1.5 * inch, height=1.5 * inch, kind='proportional')
        logo.hAlign = 'CENTER'
        elements.append(logo)
        elements.append(Spacer(1, 10))
    except Exception:
        # Fallback if logo not found
        elements.append(Paragraph('🏥 Arogya Mitra', styles['ReportTitle']))

    elements.append(Paragraph('Comprehensive Health Report', styles['ReportSubtitle']))

    # User info line
    today = datetime.date.today().strftime('%B %d, %Y')
    user_info = f"Prepared for <b>{user.first_name} {user.last_name}</b> &nbsp;|&nbsp; {user.email} &nbsp;|&nbsp; Generated on {today}"
    elements.append(Paragraph(user_info, styles['BodyText2']))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width='100%', thickness=1, color=BRAND_BORDER, spaceAfter=12))

    # ── Section 1: Health Summary ──
    elements.append(Paragraph('📊 Health Summary', styles['SectionTitle']))
    summary = report_data.get('summary', {})
    elements.append(_build_summary_table(summary))
    elements.append(Spacer(1, 8))

    # ── Section 2: AI Prediction History ──
    predictions = report_data.get('prediction_history', [])
    if predictions:
        elements.append(Paragraph('🤖 AI Prediction History', styles['SectionTitle']))
        elements.append(Paragraph(
            f'Showing the last {len(predictions)} AI-powered disease risk predictions.',
            styles['BodyText2']
        ))
        elements.append(_build_predictions_table(predictions))
        elements.append(Spacer(1, 8))

    # ── Section 3: Health Log Trends ──
    trends = report_data.get('health_trends', [])
    if trends:
        elements.append(Paragraph('📈 Health Log Trends (Last 30 Days)', styles['SectionTitle']))
        elements.append(Paragraph(
            f'{len(trends)} health log entries recorded.',
            styles['BodyText2']
        ))
        elements.append(_build_health_trends_table(trends))
        elements.append(Spacer(1, 8))

    # ── Section 4: Daily Check-in Summary ──
    checkin = report_data.get('checkin_summary', {})
    if checkin and checkin.get('total_checkins', 0) > 0:
        elements.append(Paragraph('🧠 Daily Check-in Summary', styles['SectionTitle']))
        elements.append(Paragraph(
            f'Based on {checkin["total_checkins"]} daily lifestyle check-ins.',
            styles['BodyText2']
        ))
        elements.append(_build_checkin_summary_table(checkin))
        elements.append(Spacer(1, 8))

    # ── Footer ──
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=BRAND_BORDER, spaceAfter=8))
    elements.append(Paragraph(
        'This report is auto-generated by Arogya Mitra. '
        'It is for informational purposes only and does not constitute medical advice. '
        'Please consult a qualified healthcare professional for medical decisions.',
        styles['SmallGray']
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer
