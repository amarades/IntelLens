import os
from io import BytesIO
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from app.schemas.research import ResearchResult
from app.core.exceptions import ReportGenerationError
from app.core.logging import logger

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render page numbers (e.g. Page X of Y)
    on the bottom of all pages except the cover page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count: int):
        if self._pageNumber == 1:
            # Skip cover page footer
            return
            
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#4A5568"))
        
        # Header banner
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 750, 558, 750)
        self.drawString(54, 755, "IntelLens Research Assistant - Intelligence Report")
        
        # Footer
        self.line(54, 60, 558, 60)
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 45, page_text)
        self.drawString(54, 45, "CONFIDENTIAL - Internal Use Only")
        
        self.restoreState()

class PDFGeneratorService:
    """
    ReportLab PDF Generation engine implementing professional typography,
    clean spacing, dynamic flowables, and modern tables.
    """
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        # Color definitions
        primary_color = colors.HexColor("#1A365D")    # Dark slate navy
        secondary_color = colors.HexColor("#2B6CB0")  # Royal blue
        text_color = colors.HexColor("#2D3748")       # Off-black Charcoal
        
        # Custom styles additions
        self.title_style = ParagraphStyle(
            'CoverTitle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=32,
            leading=38,
            textColor=primary_color,
            spaceAfter=15
        )
        
        self.subtitle_style = ParagraphStyle(
            'CoverSubtitle',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=16,
            leading=22,
            textColor=secondary_color,
            spaceAfter=40
        )
        
        self.meta_style = ParagraphStyle(
            'CoverMeta',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#718096")
        )

        self.h1_style = ParagraphStyle(
            'SectionH1',
            parent=self.styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=20,
            leading=26,
            textColor=primary_color,
            spaceBefore=22,
            spaceAfter=10,
            keepWithNext=True
        )

        self.h2_style = ParagraphStyle(
            'SectionH2',
            parent=self.styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=18,
            textColor=secondary_color,
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True
        )

        self.body_style = ParagraphStyle(
            'SectionBody',
            parent=self.styles['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            leading=15,
            textColor=text_color,
            spaceAfter=10
        )

        self.bullet_style = ParagraphStyle(
            'BulletStyle',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=text_color,
            leftIndent=15,
            bulletIndent=5,
            spaceAfter=4
        )

    def generate_report(self, data: ResearchResult) -> bytes:
        """
        Builds a styled PDF binary stream for the researched company result.
        """
        try:
            buffer = BytesIO()
            # letter size margins = 0.75 in (54 points)
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                leftMargin=54,
                rightMargin=54,
                topMargin=72,
                bottomMargin=72
            )

            story = []

            # ----------------- 1. COVER PAGE -----------------
            story.append(Spacer(1, 150))
            story.append(Paragraph("IntelLens Intelligence Report", self.title_style))
            story.append(Paragraph(f"Strategic Company Dossier for {data.company_profile.name}", self.subtitle_style))
            
            # Subtle accent separator
            accent_bar = Table([[""]], colWidths=[504], rowHeights=[4])
            accent_bar.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#2B6CB0")),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            story.append(accent_bar)
            story.append(Spacer(1, 30))

            story.append(Paragraph(f"<b>Target Site:</b> {data.company_profile.tagline}", self.body_style))
            story.append(Paragraph(f"<b>Primary Sector:</b> {data.company_profile.industry}", self.body_style))
            story.append(Paragraph(f"<b>Estimated Scale:</b> {data.company_profile.estimated_size}", self.body_style))
            
            # Technology tags list
            techs = ", ".join(data.technologies) if data.technologies else "None Detected"
            story.append(Paragraph(f"<b>Detected Tech Stack:</b> {techs}", self.body_style))
            
            story.append(Spacer(1, 150))
            story.append(Paragraph("Generated by IntelLens Research Engine<br/>Confidentiality Level: Internal distribution only.", self.meta_style))
            story.append(PageBreak())

            # ----------------- 2. DETAILED SUMMARY -----------------
            story.append(Paragraph("Executive Overview", self.h1_style))
            story.append(Paragraph(data.company_profile.detailed_description, self.body_style))
            story.append(Spacer(1, 10))

            # ----------------- 3. PRODUCTS & SERVICES -----------------
            if data.products_services:
                story.append(Paragraph("Products & Offerings", self.h1_style))
                for item in data.products_services:
                    story.append(Paragraph(item.name, self.h2_style))
                    story.append(Paragraph(item.description, self.body_style))
                    if item.features:
                        for feature in item.features:
                            story.append(Paragraph(f"&bull; {feature}", self.bullet_style))
                    story.append(Spacer(1, 8))
                story.append(Spacer(1, 10))

            # ----------------- 4. SWOT ANALYSIS -----------------
            story.append(Paragraph("Strategic SWOT Framework", self.h1_style))
            swot_data = [
                [
                    Paragraph("<b>STRENGTHS</b>", self.h2_style),
                    Paragraph("<b>WEAKNESSES</b>", self.h2_style)
                ],
                [
                    Paragraph("<br/>".join([f"&bull; {s}" for s in data.swot.strengths]) if data.swot.strengths else "No direct strengths noted.", self.body_style),
                    Paragraph("<br/>".join([f"&bull; {w}" for w in data.swot.weaknesses]) if data.swot.weaknesses else "No direct weaknesses noted.", self.body_style)
                ],
                [
                    Paragraph("<b>OPPORTUNITIES</b>", self.h2_style),
                    Paragraph("<b>THREATS</b>", self.h2_style)
                ],
                [
                    Paragraph("<br/>".join([f"&bull; {o}" for o in data.swot.opportunities]) if data.swot.opportunities else "No opportunities noted.", self.body_style),
                    Paragraph("<br/>".join([f"&bull; {t}" for t in data.swot.threats]) if data.swot.threats else "No threats noted.", self.body_style)
                ]
            ]
            swot_table = Table(swot_data, colWidths=[247, 247])
            swot_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,0), colors.HexColor("#EBF8FF")),
                ('BACKGROUND', (1,0), (1,0), colors.HexColor("#FFF5F5")),
                ('BACKGROUND', (0,2), (0,2), colors.HexColor("#F0FFF4")),
                ('BACKGROUND', (1,2), (1,2), colors.HexColor("#FFFFF0")),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
                ('TOPPADDING', (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ]))
            
            # Wrap table in a keep together to avoid ugly splits
            story.append(KeepTogether([swot_table]))
            story.append(Spacer(1, 20))

            # ----------------- 5. PAIN POINTS -----------------
            story.append(Paragraph("Pain Points & Operational Analysis", self.h1_style))
            story.append(Paragraph("<b>Target Customer Pain Points Resolved:</b>", self.h2_style))
            for cpp in data.pain_points.customer_pain_points:
                story.append(Paragraph(f"&bull; {cpp}", self.bullet_style))
            story.append(Spacer(1, 6))

            story.append(Paragraph("<b>Internal Scale Challenges & Risk Profile:</b>", self.h2_style))
            for ic in data.pain_points.internal_challenges:
                story.append(Paragraph(f"&bull; {ic}", self.bullet_style))
            story.append(Spacer(1, 15))

            # ----------------- 6. COMPETITIVE LANDSCAPE -----------------
            if data.competitors:
                story.append(Paragraph("Competitive Landscape", self.h1_style))
                for comp in data.competitors:
                    story.append(Paragraph(f"{comp.name} (Overlap Score: {comp.overlap_score}%)", self.h2_style))
                    if comp.website:
                        story.append(Paragraph(f"<i>Website: {comp.website}</i>", self.body_style))
                    story.append(Paragraph(comp.comparison, self.body_style))
                    story.append(Spacer(1, 6))

            # Build document
            doc.build(story, canvasmaker=NumberedCanvas)
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes

        except Exception as e:
            logger.error(f"Failed to generate report PDF: {str(e)}")
            raise ReportGenerationError(f"PDF build failed: {str(e)}")
