import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DossierRow, DonneesFinancieresRow } from '@/hooks/useDossiers';
import type { ScoringResult, DonneesFinancieres } from '@/types/dossier.types';
import { calculerScoring, calculerRatios } from '@/lib/scoring';

interface ExportPDFOptions {
  dossier: DossierRow;
  donneesFinancieres: DonneesFinancieresRow[];
}

export function exportScoringToPDF({ dossier, donneesFinancieres }: ExportPDFOptions) {
  const doc = new jsPDF();
  
  // Transform donnees financieres
  const financieresFormatted: DonneesFinancieres[] = donneesFinancieres.map(df => ({
    id: df.id,
    dossierId: df.dossier_id,
    anneeExercice: df.annee_exercice,
    chiffreAffaires: df.chiffre_affaires ?? undefined,
    resultatNet: df.resultat_net ?? undefined,
    ebitda: df.ebitda ?? undefined,
    capaciteAutofinancement: df.capacite_autofinancement ?? undefined,
    totalActif: df.total_actif ?? undefined,
    actifCirculant: df.actif_circulant ?? undefined,
    stocks: df.stocks ?? undefined,
    creancesClients: df.creances_clients ?? undefined,
    tresorerie: df.tresorerie ?? undefined,
    totalPassif: df.total_passif ?? undefined,
    capitauxPropres: df.capitaux_propres ?? undefined,
    dettesFinancieres: df.dettes_financieres ?? undefined,
    passifCirculant: df.passif_circulant ?? undefined,
    dettesFournisseurs: df.dettes_fournisseurs ?? undefined,
    createdAt: new Date(df.created_at),
  }));

  // Calculate scoring and ratios
  const scoring = financieresFormatted.length > 0 ? calculerScoring(financieresFormatted, {
    dateCreation: dossier.date_creation ? new Date(dossier.date_creation) : undefined,
    dirigeantExperience: dossier.dirigeant_experience ?? undefined,
    dirigeantFicheFicp: dossier.dirigeant_fiche_ficp ?? false,
    enProcedure: dossier.en_procedure,
    secteurActivite: dossier.secteur_activite ?? undefined,
  }) : null;

  const ratios = financieresFormatted.length > 0 ? calculerRatios(financieresFormatted) : [];

  // Colors
  const primaryColor: [number, number, number] = [0, 145, 90];
  const textColor: [number, number, number] = [50, 50, 50];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FinDecision', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Rapport d\'analyse de financement', 14, 30);
  
  doc.setFontSize(10);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 140, 30);

  // Company info
  let yPos = 50;
  
  doc.setTextColor(...textColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(dossier.raison_sociale, 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`SIREN: ${dossier.siren} | Forme juridique: ${dossier.forme_juridique || 'N/A'} | Secteur: ${dossier.secteur_activite || 'N/A'}`, 14, yPos);
  
  // Financing request summary
  yPos += 15;
  doc.setFillColor(240, 240, 240);
  doc.rect(14, yPos - 5, 182, 25, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Demande de financement', 18, yPos + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Type: ${dossier.type_financement.toUpperCase()}`, 18, yPos + 12);
  doc.text(`Montant: ${dossier.montant_demande.toLocaleString('fr-FR')} €`, 80, yPos + 12);
  doc.text(`Durée: ${dossier.duree_mois || 'N/A'} mois`, 150, yPos + 12);

  // Score section
  yPos += 35;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('SCORING GLOBAL', 14, yPos);

  if (scoring) {
    yPos += 10;
    
    // Score badge
    const scoreColor = scoring.scoreGlobal >= 80 ? [34, 197, 94] : 
                       scoring.scoreGlobal >= 60 ? [245, 158, 11] :
                       scoring.scoreGlobal >= 40 ? [249, 115, 22] : [239, 68, 68];
    
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.roundedRect(14, yPos - 5, 40, 20, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${scoring.scoreGlobal}/100`, 24, yPos + 7);

    // Status
    const statusLabel = scoring.statut === 'accord_favorable' ? 'ACCORD FAVORABLE' :
                        scoring.statut === 'accord_conditionne' ? 'ACCORD SOUS CONDITIONS' :
                        scoring.statut === 'etude_approfondie' ? 'ÉTUDE APPROFONDIE' : 'REFUS RECOMMANDÉ';
    
    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.text(statusLabel, 60, yPos + 7);

    // Score details table
    yPos += 25;
    autoTable(doc, {
      startY: yPos,
      head: [['Critère', 'Poids', 'Score', 'Points']],
      body: scoring.details.map(d => [
        d.critere,
        `${d.poids}%`,
        `${d.scoreObtenu}/5`,
        `${d.points.toFixed(0)}/${d.poids}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    yPos += 10;
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.text('Données financières insuffisantes pour calculer le scoring', 14, yPos);
    yPos += 15;
  }

  // Ratios table (new page if needed)
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RATIOS FINANCIERS', 14, yPos);

  if (ratios.length > 0) {
    yPos += 10;
    autoTable(doc, {
      startY: yPos,
      head: [['Ratio', 'Valeur N', 'N-1', 'N-2', 'Seuil', 'Statut']],
      body: ratios.map(r => [
        r.nom,
        r.valeurN !== null ? formatValue(r.valeurN, r.unite) : '-',
        r.valeurN1 !== null ? formatValue(r.valeurN1, r.unite) : '-',
        r.valeurN2 !== null ? formatValue(r.valeurN2, r.unite) : '-',
        r.seuil,
        r.statut === 'good' ? '✓' : r.statut === 'warning' ? '⚠' : '✗'
      ]),
      theme: 'striped',
      headStyles: { fillColor: primaryColor },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        5: { halign: 'center' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Recommendation (new page)
  doc.addPage();
  yPos = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('RECOMMANDATION', 14, yPos);

  if (scoring) {
    yPos += 15;
    
    // Calculate recommendation details
    const lastFinanciere = financieresFormatted[0];
    const cafMoyenne = financieresFormatted.reduce((sum, f) => sum + (f.capaciteAutofinancement ?? 0), 0) / Math.max(financieresFormatted.length, 1);
    const dettesActuelles = lastFinanciere?.dettesFinancieres ?? 0;
    const endettementActuel = cafMoyenne > 0 ? dettesActuelles / cafMoyenne : 10;
    const capaciteResiduelle = Math.max(0, (3.5 - endettementActuel) * cafMoyenne);
    const montantFinancable = Math.min(dossier.montant_demande, capaciteResiduelle / 0.85);

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(`• Montant finançable recommandé: ${Math.round(montantFinancable).toLocaleString('fr-FR')} €`, 14, yPos);
    yPos += 7;
    doc.text(`• CAF moyenne: ${Math.round(cafMoyenne).toLocaleString('fr-FR')} €/an`, 14, yPos);
    yPos += 7;
    doc.text(`• Endettement actuel: ${endettementActuel.toFixed(1)} années de CAF`, 14, yPos);
    yPos += 7;
    doc.text(`• Capacité résiduelle: ${Math.round(capaciteResiduelle).toLocaleString('fr-FR')} €`, 14, yPos);

    // Guarantees
    yPos += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('Garanties requises:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    
    yPos += 7;
    const garanties = [
      scoring.scoreGlobal < 80 ? 'Garantie BPI Développement TPE (70% du prêt)' : null,
      'Caution personnelle dirigeant (limitée à 50% conformément loi Dutreil)',
      dossier.type_financement === 'investissement' ? 'Nantissement du bien financé' : null,
    ].filter(Boolean);

    garanties.forEach(g => {
      doc.text(`  - ${g}`, 14, yPos);
      yPos += 6;
    });

    // Conditions
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Conditions particulières:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    
    yPos += 7;
    const conditions = [
      scoring.scoreGlobal < 70 ? 'Apport personnel minimum 15%' : null,
      scoring.scoreGlobal < 70 ? 'Suivi trimestriel renforcé première année' : null,
      dossier.en_procedure ? 'Attestation de bonne exécution du plan' : null,
      'Clause de revoyure si dégradation ratios',
    ].filter(Boolean);

    conditions.forEach(c => {
      doc.text(`  - ${c}`, 14, yPos);
      yPos += 6;
    });

    // Final decision
    yPos += 15;
    const decision = scoring.statut === 'accord_favorable' ? 'ACCORD FAVORABLE' :
                     scoring.statut === 'accord_conditionne' ? 'ACCORD FAVORABLE sous conditions garanties renforcées' :
                     scoring.statut === 'etude_approfondie' ? 'ÉTUDE APPROFONDIE NÉCESSAIRE' : 'REFUS RECOMMANDÉ';

    doc.setFillColor(scoring.scoreGlobal >= 60 ? 34 : 239, scoring.scoreGlobal >= 60 ? 197 : 68, scoring.scoreGlobal >= 60 ? 94 : 68);
    doc.roundedRect(14, yPos - 5, 182, 15, 3, 3, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Recommandation finale: ${decision}`, 20, yPos + 5);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} / ${pageCount}`, 100, 290, { align: 'center' });
    doc.text('Document confidentiel - Usage professionnel uniquement', 100, 295, { align: 'center' });
  }

  // Save
  doc.save(`Rapport_Scoring_${dossier.raison_sociale.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function formatValue(value: number, unite?: string): string {
  if (unite === '€') return `${value.toLocaleString('fr-FR')} €`;
  if (unite === '%') return `${value.toFixed(1)}%`;
  if (unite === 'j') return `${Math.round(value)} j`;
  if (unite === 'ans') return `${value.toFixed(1)} ans`;
  if (unite === 'x') return `${value.toFixed(2)}x`;
  return value.toFixed(2);
}
