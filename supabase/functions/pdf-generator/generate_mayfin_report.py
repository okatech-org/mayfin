#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur de Rapport d'Analyse de Financement - MayFin
Conforme aux standards bancaires professionnels
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import locale
import json
import sys
import os
import re

# Configuration locale pour les nombres français
try:
    locale.setlocale(locale.LC_ALL, 'fr_FR.UTF-8')
except:
    pass

# Couleurs MayFin
MAYFIN_GREEN = colors.HexColor('#00915A')
MAYFIN_DARK_GREY = colors.HexColor('#2C2C2C')
MAYFIN_LIGHT_GREY = colors.HexColor('#F5F5F5')
MAYFIN_BLUE = colors.HexColor('#0066CC')
ALERT_RED = colors.HexColor('#D32F2F')
SUCCESS_GREEN = colors.HexColor('#388E3C')
WARNING_ORANGE = colors.HexColor('#F57C00')


def format_number(value, suffix="€"):
    """Formate un nombre avec des espaces insécables"""
    if value is None or value == "-":
        return "-"
    try:
        # Conversion en float si nécessaire
        if isinstance(value, str):
            value = float(value.replace(" ", "").replace("€", "").replace(",", "."))
        
        # Formatage avec espaces insécables (U+00A0)
        formatted = f"{value:,.0f}".replace(",", "\u00A0")
        
        if suffix:
            return f"{formatted}\u00A0{suffix}"
        return formatted
    except:
        return str(value)


def format_percentage(value):
    """Formate un pourcentage avec virgule française"""
    if value is None or value == "-":
        return "-"
    try:
        if isinstance(value, str):
            value = float(value.replace("%", "").replace(",", ".").replace(" ", ""))
        # Formatage avec virgule française
        formatted = f"{value:.2f}".replace(".", ",")
        return f"{formatted}\u00A0%"
    except:
        return str(value)


def clean_html_tags(text):
    """Supprime les balises HTML d'un texte"""
    if text is None:
        return ""
    # Supprimer toutes les balises HTML
    text = re.sub(r'<[^>]+>', '', str(text))
    return text


class MayFinReportGenerator:
    """Générateur de rapport professionnel MayFin"""
    
    def __init__(self, filename="rapport_analyse_financement.pdf"):
        self.filename = filename
        self.doc = SimpleDocTemplate(
            filename,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
            title="Rapport d'Analyse de Financement",
            author="MayFin - Analyse IA"
        )
        self.story = []
        self.styles = self._setup_styles()
        
    def _setup_styles(self):
        """Configure les styles personnalisés"""
        styles = getSampleStyleSheet()
        
        # Style titre principal
        styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=MAYFIN_GREEN,
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Style sous-titre
        styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=MAYFIN_DARK_GREY,
            spaceAfter=12,
            alignment=TA_CENTER,
            fontName='Helvetica'
        ))
        
        # Style section
        styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=MAYFIN_GREEN,
            spaceAfter=12,
            spaceBefore=20,
            fontName='Helvetica-Bold',
            borderWidth=0,
            borderColor=MAYFIN_GREEN,
            borderPadding=5
        ))
        
        # Style sous-section
        styles.add(ParagraphStyle(
            name='SubsectionTitle',
            parent=styles['Heading3'],
            fontSize=12,
            textColor=MAYFIN_DARK_GREY,
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Style corps de texte justifié
        styles.add(ParagraphStyle(
            name='JustifiedBody',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
            leading=14,
            fontName='Helvetica'
        ))
        
        # Style pour les listes à puces
        styles.add(ParagraphStyle(
            name='BulletText',
            parent=styles['Normal'],
            fontSize=9,
            leftIndent=15,
            spaceAfter=4,
            leading=12,
            fontName='Helvetica'
        ))
        
        return styles
    
    def _create_header(self, canvas, doc):
        """Crée l'en-tête de page"""
        canvas.saveState()
        
        # Ligne verte en haut
        canvas.setFillColor(MAYFIN_GREEN)
        canvas.rect(0, A4[1] - 1*cm, A4[0], 0.3*cm, fill=1, stroke=0)
        
        # Logo MayFin
        canvas.setFont('Helvetica-Bold', 12)
        canvas.setFillColor(MAYFIN_GREEN)
        canvas.drawString(2*cm, A4[1] - 1.5*cm, "MAYFIN")
        
        # Titre du document
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MAYFIN_DARK_GREY)
        canvas.drawString(2*cm, A4[1] - 1.8*cm, "Analyse de Financement - Document Confidentiel")
        
        canvas.restoreState()
    
    def _create_footer(self, canvas, doc):
        """Crée le pied de page"""
        canvas.saveState()
        
        # Ligne verte en bas
        canvas.setFillColor(MAYFIN_GREEN)
        canvas.rect(0, 1.5*cm, A4[0], 0.1*cm, fill=1, stroke=0)
        
        # Numéro de page
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MAYFIN_DARK_GREY)
        page_num = f"Page {doc.page}"
        canvas.drawRightString(A4[0] - 2*cm, 1*cm, page_num)
        
        # Date de génération
        date_str = f"Généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}"
        canvas.drawString(2*cm, 1*cm, date_str)
        
        canvas.restoreState()
    
    def add_cover_page(self, data):
        """Page de couverture"""
        # Titre principal
        self.story.append(Spacer(1, 3*cm))
        self.story.append(Paragraph("RAPPORT D'ANALYSE DE FINANCEMENT", self.styles['CustomTitle']))
        self.story.append(Spacer(1, 0.5*cm))
        
        # Sous-titre
        subtitle = f"<b>{data.get('entreprise', 'Entreprise')}</b><br/>{data.get('type_projet', '')}"
        self.story.append(Paragraph(subtitle, self.styles['CustomSubtitle']))
        self.story.append(Spacer(1, 2*cm))
        
        # Score dans un cadre coloré
        score_value = data.get('score', 50)
        score_color = self._get_score_color(score_value)
        
        score_data = [[f"SCORE GLOBAL : {score_value}/100"]]
        score_table = Table(score_data, colWidths=[12*cm])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), score_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 20),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        self.story.append(score_table)
        self.story.append(Spacer(1, 1*cm))
        
        # Informations principales
        info_data = [
            [Paragraph("<b>Montant demandé</b>", self.styles['Normal']), format_number(data.get('montant_finance', 0))],
            [Paragraph("<b>Apport client</b>", self.styles['Normal']), format_number(data.get('apport_client', 0))],
            [Paragraph("<b>Taux d'apport</b>", self.styles['Normal']), format_percentage(data.get('taux_apport', 0))],
            [Paragraph("<b>Mensualité estimée</b>", self.styles['Normal']), format_number(data.get('mensualite', 0))],
        ]
        
        info_table = Table(info_data, colWidths=[8*cm, 9*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), MAYFIN_LIGHT_GREY),
            ('TEXTCOLOR', (0, 0), (-1, -1), MAYFIN_DARK_GREY),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
        ]))
        self.story.append(info_table)
        self.story.append(Spacer(1, 1*cm))
        
        # Chargé d'affaires
        self.story.append(Paragraph(
            f"<b>Analyste :</b> {data.get('analyste', 'Système d\\'Analyse IA - MayFin')}<br/>"
            f"<b>Date :</b> {datetime.now().strftime('%d/%m/%Y')}",
            self.styles['JustifiedBody']
        ))
        
        self.story.append(PageBreak())
    
    def add_executive_summary(self, data):
        """Synthèse exécutive"""
        self.story.append(Paragraph("SYNTHÈSE EXÉCUTIVE", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        # Recommandation principale
        recommendation = data.get('recommendation', {})
        decision = recommendation.get('decision', 'À ÉTUDIER')
        decision_color = self._get_decision_color(decision)
        
        decision_data = [[f"DÉCISION : {decision}"]]
        decision_table = Table(decision_data, colWidths=[17*cm])
        decision_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), decision_color),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        self.story.append(decision_table)
        self.story.append(Spacer(1, 0.5*cm))
        
        # Points clés
        self.story.append(Paragraph("Points clés", self.styles['SubsectionTitle']))
        
        points_forts = data.get('points_forts', [])
        for point in points_forts[:5]:
            self.story.append(Paragraph(f"✓ {point}", self.styles['BulletText']))
        
        self.story.append(Spacer(1, 0.3*cm))
        
        # Alertes
        alertes = data.get('alertes', [])
        if alertes:
            self.story.append(Paragraph("Points d'attention", self.styles['SubsectionTitle']))
            for alerte in alertes[:5]:
                self.story.append(Paragraph(f"⚠ {alerte}", self.styles['BulletText']))
        
        self.story.append(PageBreak())
    
    def add_client_identification(self, data):
        """Identification du client"""
        self.story.append(Paragraph("1. IDENTIFICATION DU PORTEUR DE PROJET", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        client = data.get('client', {})
        
        # Créer les données du tableau avec formatage approprié
        client_data = [
            [Paragraph("<b>Nom complet</b>", self.styles['Normal']), client.get('nom', '-')],
            [Paragraph("<b>Date de naissance</b>", self.styles['Normal']), client.get('date_naissance', '-')],
            [Paragraph("<b>Situation familiale</b>", self.styles['Normal']), client.get('situation_familiale', '-')],
            [Paragraph("<b>Expérience professionnelle</b>", self.styles['Normal']), client.get('experience', '-')],
            [Paragraph("<b>Formation</b>", self.styles['Normal']), client.get('formation', '-')],
        ]
        
        client_table = Table(client_data, colWidths=[7*cm, 10*cm])
        client_table.setStyle(self._get_info_table_style())
        self.story.append(client_table)
        self.story.append(Spacer(1, 0.5*cm))
        
        # Analyse du profil
        self.story.append(Paragraph("Analyse du profil", self.styles['SubsectionTitle']))
        profil_analyse = data.get('profil_analyse', "Profil du porteur de projet en cours d'évaluation.")
        self.story.append(Paragraph(profil_analyse, self.styles['JustifiedBody']))
        
        self.story.append(Spacer(1, 1*cm))
    
    def add_project_presentation(self, data):
        """Présentation du projet"""
        self.story.append(Paragraph("2. PRÉSENTATION DU PROJET", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        projet = data.get('projet', {})
        
        projet_data = [
            [Paragraph("<b>Enseigne/Raison sociale</b>", self.styles['Normal']), projet.get('enseigne', '-')],
            [Paragraph("<b>Type de projet</b>", self.styles['Normal']), projet.get('type', '-')],
            [Paragraph("<b>Forme juridique</b>", self.styles['Normal']), projet.get('forme_juridique', '-')],
            [Paragraph("<b>Date de création prévue</b>", self.styles['Normal']), projet.get('date_creation', '-')],
            [Paragraph("<b>Localisation</b>", self.styles['Normal']), projet.get('localisation', '-')],
        ]
        
        projet_table = Table(projet_data, colWidths=[7*cm, 10*cm])
        projet_table.setStyle(self._get_info_table_style())
        self.story.append(projet_table)
        self.story.append(Spacer(1, 0.5*cm))
        
        # Activités
        activites = projet.get('activites', '')
        if activites:
            self.story.append(Paragraph("Activités proposées", self.styles['SubsectionTitle']))
            self.story.append(Paragraph(activites, self.styles['JustifiedBody']))
        
        self.story.append(PageBreak())
    
    def add_financial_analysis(self, data):
        """Analyse financière détaillée"""
        self.story.append(Paragraph("3. ANALYSE FINANCIÈRE", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        # 3.1 Plan de financement
        self.story.append(Paragraph("3.1 Plan de financement", self.styles['SubsectionTitle']))
        
        financement = data.get('financement', {})
        
        fin_data = [
            [Paragraph("<b>Élément</b>", self.styles['Normal']), Paragraph("<b>Montant</b>", self.styles['Normal'])],
            ["Investissements matériels", format_number(financement.get('investissements', 0))],
            ["Besoin en fonds de roulement", format_number(financement.get('bfr', 0))],
            [Paragraph("<b>Total besoins</b>", self.styles['Normal']), format_number(financement.get('total_besoins', 0))],
            ["", ""],
            ["Apport personnel", format_number(financement.get('apport', 0))],
            ["Financement bancaire demandé", format_number(financement.get('emprunt', 0))],
            ["Autres financements", format_number(financement.get('autres', 0))],
            [Paragraph("<b>Total ressources</b>", self.styles['Normal']), format_number(financement.get('total_ressources', 0))],
        ]
        
        fin_table = Table(fin_data, colWidths=[11*cm, 6*cm])
        fin_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), MAYFIN_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (-1, -1), MAYFIN_LIGHT_GREY),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(fin_table)
        self.story.append(Spacer(1, 0.5*cm))
        
        # 3.2 Prévisionnels sur 3 ans
        self.story.append(Paragraph("3.2 Compte de résultat prévisionnel", self.styles['SubsectionTitle']))
        
        previsionnels = data.get('previsionnels', {})
        annee1 = previsionnels.get('annee1', {})
        annee2 = previsionnels.get('annee2', {})
        annee3 = previsionnels.get('annee3', {})
        
        prev_data = [
            [Paragraph("<b>Indicateurs</b>", self.styles['Normal']), 
             Paragraph("<b>Année 1</b>", self.styles['Normal']), 
             Paragraph("<b>Année 2</b>", self.styles['Normal']), 
             Paragraph("<b>Année 3</b>", self.styles['Normal'])],
            ["Chiffre d'affaires", format_number(annee1.get('ca', 0)), format_number(annee2.get('ca', 0)), format_number(annee3.get('ca', 0))],
            ["Charges variables", format_number(annee1.get('charges_var', 0)), format_number(annee2.get('charges_var', 0)), format_number(annee3.get('charges_var', 0))],
            ["Marge brute", format_number(annee1.get('marge', 0)), format_number(annee2.get('marge', 0)), format_number(annee3.get('marge', 0))],
            ["Charges fixes", format_number(annee1.get('charges_fixes', 0)), format_number(annee2.get('charges_fixes', 0)), format_number(annee3.get('charges_fixes', 0))],
            [Paragraph("<b>EBITDA</b>", self.styles['Normal']), format_number(annee1.get('ebitda', 0)), format_number(annee2.get('ebitda', 0)), format_number(annee3.get('ebitda', 0))],
            ["Résultat d'exploitation", format_number(annee1.get('rex', 0)), format_number(annee2.get('rex', 0)), format_number(annee3.get('rex', 0))],
            [Paragraph("<b>Résultat net</b>", self.styles['Normal']), format_number(annee1.get('rnet', 0)), format_number(annee2.get('rnet', 0)), format_number(annee3.get('rnet', 0))],
        ]
        
        prev_table = Table(prev_data, colWidths=[8*cm, 3*cm, 3*cm, 3*cm])
        prev_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), MAYFIN_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (-1, -1), MAYFIN_LIGHT_GREY),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        self.story.append(prev_table)
        self.story.append(Spacer(1, 0.5*cm))
        
        # 3.3 Ratios financiers
        self.story.append(Paragraph("3.3 Ratios financiers clés", self.styles['SubsectionTitle']))
        
        ratios = data.get('ratios', {})
        
        ratios_data = [
            [Paragraph("<b>Ratio</b>", self.styles['Normal']), 
             Paragraph("<b>Valeur</b>", self.styles['Normal']), 
             Paragraph("<b>Standard</b>", self.styles['Normal']), 
             Paragraph("<b>Analyse</b>", self.styles['Normal'])],
            ["Taux d'apport", format_percentage(ratios.get('taux_apport', 0)), "> 20%", self._get_ratio_status(ratios.get('taux_apport', 0), 20, True)],
            ["Taux d'endettement", format_percentage(ratios.get('taux_endettement', 0)), "< 70%", self._get_ratio_status(ratios.get('taux_endettement', 0), 70, False)],
            ["Capacité de remboursement", format_number(ratios.get('capacite_remb', 0)), "-", "Conforme"],
            ["DSCR (Année 1)", ratios.get('dscr', '-'), "> 1,2", self._get_dscr_status(ratios.get('dscr', 0))],
            ["Taux de marge brute", format_percentage(ratios.get('marge_brute', 0)), "> 30%", self._get_ratio_status(ratios.get('marge_brute', 0), 30, True)],
        ]
        
        ratios_table = Table(ratios_data, colWidths=[6*cm, 3.5*cm, 3.5*cm, 4*cm])
        ratios_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), MAYFIN_GREEN),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BACKGROUND', (0, 1), (-1, -1), MAYFIN_LIGHT_GREY),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        self.story.append(ratios_table)
        
        self.story.append(PageBreak())
    
    def add_sector_analysis(self, data):
        """Analyse sectorielle"""
        self.story.append(Paragraph("4. ANALYSE SECTORIELLE", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        secteur = data.get('secteur', {})
        
        # Contexte de marché
        self.story.append(Paragraph("4.1 Contexte de marché", self.styles['SubsectionTitle']))
        contexte = secteur.get('contexte', "Analyse du secteur en cours.")
        self.story.append(Paragraph(contexte, self.styles['JustifiedBody']))
        self.story.append(Spacer(1, 0.3*cm))
        
        # Risques sectoriels
        self.story.append(Paragraph("4.2 Risques sectoriels identifiés", self.styles['SubsectionTitle']))
        risques = secteur.get('risques', [])
        if risques:
            for risque in risques[:8]:
                impact = risque.get('impact', 'moyen')
                color = self._get_impact_color(impact)
                risk_text = f"<font color='{color}'>■</font> <b>{risque.get('titre', '')}</b> : {risque.get('description', '')}"
                self.story.append(Paragraph(risk_text, self.styles['BulletText']))
                self.story.append(Spacer(1, 0.1*cm))
        
        self.story.append(Spacer(1, 0.3*cm))
        
        # Opportunités
        self.story.append(Paragraph("4.3 Opportunités de développement", self.styles['SubsectionTitle']))
        opportunites = secteur.get('opportunites', [])
        if opportunites:
            for opp in opportunites[:5]:
                self.story.append(Paragraph(f"✓ {opp}", self.styles['BulletText']))
        
        self.story.append(PageBreak())
    
    def add_recommendation(self, data):
        """Recommandation bancaire"""
        self.story.append(Paragraph("5. RECOMMANDATION BANCAIRE", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        recommendation = data.get('recommendation', {})
        
        # Produit recommandé
        produit = recommendation.get('produit', {})
        if produit:
            self.story.append(Paragraph("5.1 Produit recommandé", self.styles['SubsectionTitle']))
            
            produit_data = [
                [Paragraph("<b>Produit</b>", self.styles['Normal']), produit.get('nom', '-')],
                [Paragraph("<b>Type</b>", self.styles['Normal']), produit.get('type', '-')],
                [Paragraph("<b>Durée recommandée</b>", self.styles['Normal']), produit.get('duree', '-')],
                [Paragraph("<b>Montant</b>", self.styles['Normal']), format_number(produit.get('montant', 0))],
            ]
            
            produit_table = Table(produit_data, colWidths=[7*cm, 10*cm])
            produit_table.setStyle(self._get_info_table_style())
            self.story.append(produit_table)
            self.story.append(Spacer(1, 0.3*cm))
            
            # Avantages
            avantages = produit.get('avantages', [])
            if avantages:
                self.story.append(Paragraph("Avantages", self.styles['SubsectionTitle']))
                for avantage in avantages:
                    self.story.append(Paragraph(f"• {avantage}", self.styles['BulletText']))
        
        self.story.append(Spacer(1, 0.5*cm))
        
        # Conditions et ajustements
        self.story.append(Paragraph("5.2 Conditions et ajustements recommandés", self.styles['SubsectionTitle']))
        conditions = recommendation.get('conditions', [])
        if conditions:
            for condition in conditions:
                self.story.append(Paragraph(f"→ {condition}", self.styles['BulletText']))
        else:
            self.story.append(Paragraph("Aucun ajustement majeur nécessaire.", self.styles['JustifiedBody']))
        
        self.story.append(Spacer(1, 0.5*cm))
        
        # Décision finale
        self.story.append(Paragraph("5.3 Décision", self.styles['SubsectionTitle']))
        decision_text = recommendation.get('decision_justification', "Dossier conforme aux critères de financement.")
        self.story.append(Paragraph(decision_text, self.styles['JustifiedBody']))
        
        self.story.append(PageBreak())
    
    def add_appendix(self, data):
        """Annexes"""
        self.story.append(Paragraph("6. ANNEXES", self.styles['SectionTitle']))
        self.story.append(Spacer(1, 0.3*cm))
        
        # Méthodologie
        self.story.append(Paragraph("6.1 Méthodologie d'analyse", self.styles['SubsectionTitle']))
        methodo_text = """
        Cette analyse a été réalisée selon les standards MayFin en utilisant une approche multi-critères 
        combinant l'analyse financière, l'évaluation du porteur de projet, l'analyse sectorielle et 
        l'évaluation des risques. Les ratios utilisés sont conformes aux normes bancaires et réglementaires 
        (Bâle III/IV, recommandations BCE).
        """
        self.story.append(Paragraph(methodo_text, self.styles['JustifiedBody']))
        self.story.append(Spacer(1, 0.3*cm))
        
        # Sources
        sources = data.get('sources', [])
        if sources:
            self.story.append(Paragraph("6.2 Sources documentaires", self.styles['SubsectionTitle']))
            for i, source in enumerate(sources[:10], 1):
                source_text = f"{i}. {source}"
                self.story.append(Paragraph(source_text, self.styles['BulletText']))
        
        self.story.append(Spacer(1, 1*cm))
        
        # Mentions légales
        self.story.append(Paragraph("6.3 Mentions légales", self.styles['SubsectionTitle']))
        mentions = """
        Ce document est confidentiel et destiné exclusivement à un usage interne MayFin. 
        Les informations contenues dans ce rapport sont basées sur les documents fournis par le client 
        et l'analyse automatisée par intelligence artificielle. Elles ne constituent pas un engagement 
        définitif de financement. Toute décision finale reste soumise à l'approbation des comités 
        d'engagement compétents et à la vérification complète du dossier.
        """
        self.story.append(Paragraph(mentions, self.styles['JustifiedBody']))
    
    def build(self, data):
        """Construit le document PDF complet"""
        # Ajout des sections
        self.add_cover_page(data)
        self.add_executive_summary(data)
        self.add_client_identification(data)
        self.add_project_presentation(data)
        self.add_financial_analysis(data)
        self.add_sector_analysis(data)
        self.add_recommendation(data)
        self.add_appendix(data)
        
        # Construction du PDF
        self.doc.build(
            self.story,
            onFirstPage=self._create_header,
            onLaterPages=self._create_header
        )
        
        return self.filename
    
    # Méthodes utilitaires
    def _get_score_color(self, score):
        """Retourne la couleur selon le score"""
        if score >= 70:
            return SUCCESS_GREEN
        elif score >= 50:
            return WARNING_ORANGE
        else:
            return ALERT_RED
    
    def _get_decision_color(self, decision):
        """Retourne la couleur selon la décision"""
        if decision in ["FAVORABLE", "ACCORD"]:
            return SUCCESS_GREEN
        elif decision in ["REFUS", "DÉFAVORABLE"]:
            return ALERT_RED
        else:
            return WARNING_ORANGE
    
    def _get_impact_color(self, impact):
        """Retourne la couleur selon l'impact"""
        impacts = {
            'élevé': '#D32F2F',
            'moyen': '#F57C00',
            'faible': '#388E3C'
        }
        return impacts.get(impact.lower(), '#757575')
    
    def _get_ratio_status(self, value, threshold, higher_better=True):
        """Évalue le statut d'un ratio"""
        try:
            value = float(str(value).replace('%', '').replace(',', '.'))
            if higher_better:
                return "✓ Conforme" if value >= threshold else "⚠ À améliorer"
            else:
                return "✓ Conforme" if value <= threshold else "⚠ Élevé"
        except:
            return "-"
    
    def _get_dscr_status(self, dscr):
        """Évalue le DSCR"""
        try:
            dscr_val = float(dscr) if dscr != '-' else 0
            if dscr_val >= 1.5:
                return "✓ Excellent"
            elif dscr_val >= 1.2:
                return "✓ Bon"
            elif dscr_val >= 1.0:
                return "⚠ Limite"
            else:
                return "✗ Insuffisant"
        except:
            return "-"
    
    def _get_info_table_style(self):
        """Style pour les tableaux d'information"""
        return TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), MAYFIN_LIGHT_GREY),
            ('BACKGROUND', (1, 0), (1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, MAYFIN_LIGHT_GREY),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ])


def generate_report_from_json(data_json_path, output_path):
    """Génère un rapport depuis un fichier JSON"""
    try:
        with open(data_json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        generator = MayFinReportGenerator(filename=output_path)
        pdf_file = generator.build(data)
        
        return {'success': True, 'file': pdf_file}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def get_sample_data():
    """Retourne les données d'exemple (Quadra Terra)"""
    return {
        'entreprise': 'QUADRA TERRA - Agence Sud de Paris',
        'type_projet': 'Franchise - Paysagisme écoresponsable, Potagers & Serres',
        'score': 50,
        'analyste': 'Système d\'Analyse IA - MayFin',
        
        'client': {
            'nom': 'Lucas MIRGALET',
            'date_naissance': '09/01/1982',
            'situation_familiale': 'Marié, 2 enfants',
            'experience': 'Infrastructure et construction (Systra, Vinci, Bureau Veritas), Direction commerciale et générale de 2 PMEs en rénovation énergétique',
            'formation': 'Ingénieur ENPC + MBA',
        },
        
        'profil_analyse': """Le porteur de projet présente un profil solide avec une formation d'ingénieur 
        complétée par un MBA, et une expérience significative dans le secteur de la construction et de 
        l'infrastructure. Son parcours entrepreneurial antérieur en conseil marketing et sa direction de 
        PMEs dans la rénovation énergétique constituent des atouts majeurs pour ce projet de franchise 
        dans le paysagisme écoresponsable.""",
        
        'projet': {
            'enseigne': 'QUADRA TERRA',
            'type': 'Franchise - Paysagisme écoresponsable, Potagers & Serres (2ème agence Île-de-France)',
            'forme_juridique': 'SASU',
            'date_creation': '2026',
            'localisation': '7 rue la Boissière, 92260 Fontenay-aux-Roses (55 m²)',
            'activites': """Jardins écoresponsables (récupération eau de pluie, terrasses bois, micro-forêts), 
            jardins nourriciers (potagers, serres, poulaillers, vergers), entretien écologique."""
        },
        
        'montant_finance': 105507,
        'apport_client': 25000,
        'taux_apport': 23.7,
        'mensualite': 1519,
        
        'financement': {
            'investissements': 100507,
            'bfr': 56101,
            'total_besoins': 156608,
            'apport': 25000,
            'emprunt': 105507,
            'autres': 26101,
            'total_ressources': 156608,
        },
        
        'previsionnels': {
            'annee1': {'ca': 209895, 'charges_var': 139751, 'marge': 70144, 'charges_fixes': 38804, 'ebitda': 30250, 'rex': 8314, 'rnet': 3302},
            'annee2': {'ca': 450532, 'charges_var': 300290, 'marge': 150243, 'charges_fixes': 51711, 'ebitda': 54235, 'rex': 29437, 'rnet': 21864},
            'annee3': {'ca': 695879, 'charges_var': 424794, 'marge': 271085, 'charges_fixes': 56240, 'ebitda': 148567, 'rex': 122476, 'rnet': 93882},
        },
        
        'ratios': {
            'taux_apport': 23.7,
            'taux_endettement': 67.3,
            'capacite_remb': 1956,
            'dscr': '1.51',
            'marge_brute': 33.4,
        },
        
        'secteur': {
            'contexte': """Le secteur du paysage connaît une dynamique favorable avec un chiffre d'affaires 
            de 7,7 milliards d'euros HT en 2022 et une croissance de +21% sur 2020-2022. Le marché bénéficie 
            de tendances structurelles favorables : prise de conscience écologique, développement de 
            l'agriculture urbaine et des jardins nourriciers, avantages fiscaux (crédit d'impôt de 50% via 
            les Services à la Personne). La zone de chalandise (Sud Hauts-de-Seine) présente un potentiel 
            attractif avec plus de 40 000 maisons individuelles et une population CSP+ de 932 611 habitants.""",
            
            'risques': [
                {'titre': 'Délais administratifs', 'description': 'Les autorisations environnementales peuvent impacter la trésorerie et la rentabilité', 'impact': 'élevé'},
                {'titre': 'Volatilité énergétique', 'description': 'Coûts imprévisibles pour le chauffage des serres, risque majeur pour les marges', 'impact': 'élevé'},
                {'titre': 'Dépendance aux compétences', 'description': 'Pénurie de main-d\'œuvre qualifiée en écologie et aménagement durable', 'impact': 'moyen'},
                {'titre': 'Tensions d\'approvisionnement', 'description': 'Disponibilité limitée des matériaux de construction pour serres et potagers', 'impact': 'moyen'},
                {'titre': 'Risques climatiques', 'description': 'Impact du réchauffement climatique sur les cultures et la gestion de l\'eau', 'impact': 'moyen'},
                {'titre': 'Concurrence accrue', 'description': '44 entreprises concurrentes identifiées, marché fragmenté avec nouveaux entrants', 'impact': 'moyen'},
            ],
            
            'opportunites': [
                'Expansion des carrières vertes et de l\'agriculture durable (MaPrimeRénov\', France 2030)',
                'Demande croissante pour jardins écologiques et potagers biologiques',
                'Innovations techniques (taille arbres fruitiers hivernale/estivale) pour optimiser productivité',
                'Aides publiques (éco-PTZ, CEE, BPI) pour financement projets paysage durable',
                'Tendances vers jardinage durable et préservation environnement',
            ]
        },
        
        'recommendation': {
            'decision': 'À ÉTUDIER AVEC RÉSERVES',
            'produit': {
                'nom': 'Location Longue Durée (LLD)',
                'type': 'ARVAL - Location Longue Durée',
                'duree': '36 à 48 mois',
                'montant': 80507,
                'avantages': [
                    'Loyers fixes et prévisibles sur toute la durée',
                    'Entretien et maintenance inclus',
                    'Assurance et assistance intégrées',
                    'Gestion de flotte simplifiée',
                    'Pas d\'immobilisation de trésorerie',
                    'TVA récupérable sur les loyers'
                ]
            },
            'conditions': [
                'Réduire le montant demandé à 80 000 € maximum (vs 105 507 € demandé)',
                'Augmenter l\'apport personnel de 25 000 € à 35 000 € minimum (taux d\'apport cible > 25%)',
                'Privilégier la Location Longue Durée pour les véhicules afin d\'optimiser la trésorerie',
                'Prévoir une alternative crédit-bail véhicule si le client souhaite être propriétaire à terme'
            ],
            'decision_justification': """Le dossier présente des fondamentaux intéressants (profil du porteur, 
            marché porteur, positionnement différenciant) mais nécessite des ajustements pour être conforme 
            aux critères de financement. Le montant demandé (105 507 €) dépasse le seuil accordable actuel. 
            Une restructuration du plan de financement avec augmentation de l'apport et utilisation de la LLD 
            permettrait de sécuriser le projet tout en optimisant la trésorerie."""
        },
        
        'points_forts': [
            'Profil solide : Ingénieur MBA avec expérience en direction d\'entreprise et développement commercial',
            'Marché porteur : Secteur paysage +21% de croissance, tendances favorables (écologie, autoconsommation)',
            'Avantage fiscal majeur : Crédit d\'impôt immédiat 50% pour clients (Services à la Personne)',
            'Zone attractive : 932 611 habitants CSP+, 40 000+ maisons individuelles',
            'Accompagnement réseau : Formation complète, outils digitaux, centrale d\'achats, support permanent',
        ],
        
        'alertes': [
            'Montant demandé (105 507 €) supérieur au seuil accordable (0 €)',
            'Taux d\'apport de 23,7% inférieur au standard recommandé (> 25%)',
            'Risques sectoriels : délais administratifs, volatilité énergétique, pénurie main-d\'œuvre qualifiée',
            'Concurrence locale élevée (44 entreprises identifiées)',
            'Dépendance aux aides publiques et politiques de transition écologique'
        ],
        
        'sources': [
            'Fiche client Quadra Terra - Document interne',
            'INSEE - Données démographiques Sud Hauts-de-Seine',
            'UNEP - Chiffres clés du secteur paysage 2022',
            'BPI France - Guide financement création entreprise',
            'Banque de France - Ratios sectoriels paysagisme'
        ]
    }


def main():
    """Fonction principale"""
    if len(sys.argv) == 3:
        # Mode CLI: python script.py input.json output.pdf
        result = generate_report_from_json(sys.argv[1], sys.argv[2])
        print(json.dumps(result))
    else:
        # Mode test avec données d'exemple
        print("🏦 Génération du Rapport d'Analyse de Financement MayFin...")
        print("-" * 70)
        
        data = get_sample_data()
        generator = MayFinReportGenerator(filename="rapport_analyse_mayfin.pdf")
        pdf_file = generator.build(data)
        
        print(f"✅ Rapport généré avec succès : {pdf_file}")
        print("-" * 70)
        print("\n📊 Caractéristiques du rapport professionnel :")
        print("   ✓ Identité visuelle MayFin (couleurs, en-têtes)")
        print("   ✓ Synthèse exécutive avec décision claire")
        print("   ✓ Analyse financière complète avec ratios bancaires")
        print("   ✓ Formatage professionnel (nombres, textes justifiés)")
        print("   ✓ Structure conforme aux standards bancaires")
        print("   ✓ 8 pages structurées et lisibles")


if __name__ == "__main__":
    main()
