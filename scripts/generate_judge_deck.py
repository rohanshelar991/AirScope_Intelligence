from pathlib import Path
import json
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_table(data, widths):
    table = Table(data, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f2743")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9fb3c8")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f5f8fb")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f5f8fb"), colors.HexColor("#ebf2f8")]),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def main():
    if len(sys.argv) != 5:
      raise SystemExit("Usage: generate_judge_deck.py <latest_json> <alerts_json> <analytics_json> <output_pdf>")

    latest_path = Path(sys.argv[1])
    alerts_path = Path(sys.argv[2])
    analytics_path = Path(sys.argv[3])
    output_path = Path(sys.argv[4])

    latest = json.loads(latest_path.read_text())
    alerts = json.loads(alerts_path.read_text())
    analytics = json.loads(analytics_path.read_text())

    cities = latest["cities"]
    summary = analytics["summary"]
    top_risk = sorted(cities, key=lambda city: city["aqi"], reverse=True)[:12]

    styles = getSampleStyleSheet()
    title = ParagraphStyle("DeckTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=colors.HexColor("#0b1f35"))
    subtitle = ParagraphStyle("DeckSubtitle", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=colors.HexColor("#1d4f73"))
    body = ParagraphStyle("DeckBody", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=14, textColor=colors.HexColor("#213547"))

    doc = SimpleDocTemplate(str(output_path), pagesize=A4, leftMargin=40, rightMargin=40, topMargin=42, bottomMargin=36)
    story = []

    story.extend(
        [
            Paragraph("Global Air Quality & Weather Intelligence System", title),
            Spacer(1, 10),
            Paragraph("Judge Deck", subtitle),
            Spacer(1, 16),
            Paragraph(f"Generated: {latest['generatedAt']}", body),
            Paragraph(f"Tracked cities: {summary['totalCities']}", body),
            Paragraph(f"Covered countries: {summary['totalCountries']}", body),
            Paragraph(f"Average AQI: {round(summary['averageAqi'])}", body),
            Paragraph(f"Critical cities: {summary['criticalCities']}", body),
            Paragraph(f"Triggered alerts: {summary['alertCount']}", body),
            Paragraph(f"Top pollutant: {summary['topPollutant']}", body),
            Spacer(1, 20),
            Paragraph("This deck summarizes the premium 100-plus city intelligence network, intervention modeling, and automated alert state for decision-makers.", body),
            PageBreak(),
            Paragraph("Top Risk Cities", subtitle),
            Spacer(1, 10),
        ]
    )

    story.append(
        build_table(
            [["City", "Country", "AQI", "Category", "Dominant Pollutant"]]
            + [[city["city"], city["country"], city["aqi"], city["aqiCategory"], city["dominantPollutant"].upper()] for city in top_risk],
            [160, 60, 50, 150, 100],
        )
    )
    story.append(PageBreak())
    story.append(Paragraph("Latest Alerts", subtitle))
    story.append(Spacer(1, 10))

    alert_rows = [["City", "Severity", "Rule", "AQI"]]
    for alert in alerts["alerts"][:15]:
        alert_rows.append([alert["city"], alert["severity"].upper(), alert["rule"], str(alert["aqi"])])
    if len(alert_rows) == 1:
        alert_rows.append(["None", "-", "No active alerts", "-"])

    story.append(build_table(alert_rows, [120, 70, 220, 50]))
    doc.build(story)


if __name__ == "__main__":
    main()
