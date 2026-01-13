import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import type { DossierRow } from '@/hooks/useDossiers';

const formatCurrency = (value?: number): string => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (): string => {
    return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

export async function generateSmartAnalysisWord(
    analysisResult: AnalysisResult,
    dossier?: Partial<DossierRow>
): Promise<void> {
    if (!analysisResult || !analysisResult.data) {
        throw new Error('Données d\'analyse manquantes pour générer le document Word');
    }

    const data = analysisResult.data;
    const score = analysisResult.score;
    const synthese = analysisResult.syntheseNarrative;
    const secteur = analysisResult.analyseSectorielle;

    const children: Paragraph[] = [];

    // Title
    children.push(
        new Paragraph({
            text: 'ANALYSE DE FINANCEMENT - IA',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        })
    );

    children.push(
        new Paragraph({
            text: `Rapport Multi-LLM généré le ${formatDate()}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({
                    text: `Rapport Multi-LLM généré le ${formatDate()}`,
                    italics: true,
                    color: '666666'
                })
            ]
        })
    );

    // Company info
    children.push(
        new Paragraph({
            text: 'INFORMATIONS ENTREPRISE',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        })
    );

    const companyInfo = [
        ['Raison sociale', data.entreprise.raisonSociale || '-'],
        ['SIREN', data.entreprise.siren || '-'],
        ['SIRET', data.entreprise.siret || '-'],
        ['Forme juridique', data.entreprise.formeJuridique || '-'],
        ['Secteur d\'activité', data.entreprise.secteurActivite || '-'],
        ['Code NAF', data.entreprise.codeNaf || '-'],
        ['Date de création', data.entreprise.dateCreation || '-'],
        ['Adresse', data.entreprise.adresseSiege || '-'],
        ['Effectif', `${data.entreprise.nbSalaries || '-'} salariés`]
    ];

    companyInfo.forEach(([label, value]) => {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${label}: `, bold: true }),
                    new TextRun({ text: value })
                ],
                spacing: { after: 100 }
            })
        );
    });

    // Dirigeant
    children.push(
        new Paragraph({
            text: 'DIRIGEANT',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        })
    );

    const dirigeantInfo = [
        ['Nom', `${data.dirigeant.prenom || ''} ${data.dirigeant.nom || '-'}`],
        ['Fonction', data.dirigeant.fonction || '-'],
        ['Email', data.dirigeant.email || '-'],
        ['Téléphone', data.dirigeant.telephone || '-']
    ];

    dirigeantInfo.forEach(([label, value]) => {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${label}: `, bold: true }),
                    new TextRun({ text: value })
                ],
                spacing: { after: 100 }
            })
        );
    });

    // Scoring
    if (score) {
        children.push(
            new Paragraph({
                text: 'ANALYSE DU SCORING',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        // Score global
        const recommandationText = analysisResult.recommandation || 'À ÉVALUER';
        children.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Score global: ', bold: true }),
                    new TextRun({ 
                        text: `${score.global}/100`, 
                        bold: true,
                        color: score.global >= 70 ? '27AE60' : score.global >= 45 ? 'F1C40F' : 'E74C3C'
                    }),
                    new TextRun({ text: ` - Recommandation: ` }),
                    new TextRun({ text: recommandationText, bold: true })
                ],
                spacing: { after: 200 }
            })
        );

        if (analysisResult.seuilAccordable) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Seuil accordable estimé: ', bold: true }),
                        new TextRun({ text: formatCurrency(analysisResult.seuilAccordable), color: '3498DB' })
                    ],
                    spacing: { after: 200 }
                })
            );
        }

        // Score details
        children.push(
            new Paragraph({
                text: 'Détail des scores:',
                spacing: { before: 200, after: 100 }
            })
        );

        const scoreTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    tableHeader: true,
                    children: [
                        new TableCell({ 
                            children: [new Paragraph({ text: 'Critère', alignment: AlignmentType.CENTER })],
                            shading: { fill: '3366CC', type: ShadingType.SOLID, color: '3366CC' }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: 'Score', alignment: AlignmentType.CENTER })],
                            shading: { fill: '3366CC', type: ShadingType.SOLID, color: '3366CC' }
                        }),
                        new TableCell({ 
                            children: [new Paragraph({ text: 'Pondération', alignment: AlignmentType.CENTER })],
                            shading: { fill: '3366CC', type: ShadingType.SOLID, color: '3366CC' }
                        })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Solvabilité')] }),
                        new TableCell({ children: [new Paragraph({ text: `${score.details.solvabilite}/100`, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: '30%', alignment: AlignmentType.CENTER })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Rentabilité')] }),
                        new TableCell({ children: [new Paragraph({ text: `${score.details.rentabilite}/100`, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: '30%', alignment: AlignmentType.CENTER })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Structure financière')] }),
                        new TableCell({ children: [new Paragraph({ text: `${score.details.structure}/100`, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: '20%', alignment: AlignmentType.CENTER })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph('Activité')] }),
                        new TableCell({ children: [new Paragraph({ text: `${score.details.activite}/100`, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: '20%', alignment: AlignmentType.CENTER })] })
                    ]
                })
            ]
        });

        children.push(new Paragraph({ children: [] })); // Spacer
        
        // Justifications
        if (score.justifications) {
            children.push(
                new Paragraph({
                    text: 'Justifications détaillées:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 200 }
                })
            );

            const justifLabels: Record<string, string> = {
                solvabilite: 'Solvabilité',
                rentabilite: 'Rentabilité',
                structure: 'Structure financière',
                activite: 'Activité'
            };

            Object.entries(justifLabels).forEach(([key, label]) => {
                const value = score.justifications?.[key as keyof typeof score.justifications];
                if (value) {
                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${label}: `, bold: true }),
                                new TextRun({ text: value })
                            ],
                            spacing: { after: 150 }
                        })
                    );
                }
            });
        }
    }

    // Financial data
    if (data.finances.annees.length > 0) {
        children.push(
            new Paragraph({
                text: 'DONNÉES FINANCIÈRES',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        const financeTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    tableHeader: true,
                    children: ['Année', 'CA', 'Résultat net', 'EBITDA', 'Capitaux propres'].map(h => 
                        new TableCell({ 
                            children: [new Paragraph({ text: h, alignment: AlignmentType.CENTER })],
                            shading: { fill: '3366CC', type: ShadingType.SOLID, color: '3366CC' }
                        })
                    )
                }),
                ...data.finances.annees.map(annee => 
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: String(annee.annee), alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ text: formatCurrency(annee.chiffreAffaires), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatCurrency(annee.resultatNet), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatCurrency(annee.ebitda), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatCurrency(annee.capitauxPropres), alignment: AlignmentType.RIGHT })] })
                        ]
                    })
                )
            ]
        });

        children.push(new Paragraph({ children: [] })); // Spacer
    }

    // Sector analysis
    if (secteur) {
        children.push(
            new Paragraph({
                text: 'ANALYSE SECTORIELLE',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        if (secteur.contexteMarche) {
            children.push(
                new Paragraph({
                    text: 'Contexte de marché:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { after: 100 }
                })
            );
            children.push(
                new Paragraph({
                    text: secteur.contexteMarche,
                    spacing: { after: 200 }
                })
            );
        }

        if (secteur.risquesSecteur?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Risques sectoriels:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            secteur.risquesSecteur.forEach(risque => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `• ${risque}` })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        if (secteur.opportunites?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Opportunités:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            secteur.opportunites.forEach(opp => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `• ${opp}` })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        if (secteur.benchmarkConcurrents) {
            children.push(
                new Paragraph({
                    text: 'Benchmark concurrentiel:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            children.push(
                new Paragraph({
                    text: secteur.benchmarkConcurrents,
                    spacing: { after: 200 }
                })
            );
        }
    }

    // AI Synthesis
    if (synthese) {
        children.push(
            new Paragraph({
                text: 'SYNTHÈSE IA',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        if (synthese.resumeExecutif) {
            children.push(
                new Paragraph({
                    text: 'Résumé exécutif:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { after: 100 }
                })
            );
            children.push(
                new Paragraph({
                    text: synthese.resumeExecutif,
                    spacing: { after: 200 }
                })
            );
        }

        if (synthese.pointsForts?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Points forts:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            synthese.pointsForts.forEach(point => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `✓ ${point}`, color: '27AE60' })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        if (synthese.pointsVigilance?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Points de vigilance:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            synthese.pointsVigilance.forEach(point => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `⚠ ${point}`, color: 'E67E22' })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        if (synthese.recommandationsConditions?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Recommandations et conditions:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            synthese.recommandationsConditions.forEach(rec => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `→ ${rec}` })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        if (synthese.conclusionArgumentee) {
            children.push(
                new Paragraph({
                    text: 'Conclusion:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            children.push(
                new Paragraph({
                    text: synthese.conclusionArgumentee,
                    spacing: { after: 200 }
                })
            );
        }
    }

    // Models used
    if (analysisResult.modelsUsed?.length) {
        children.push(
            new Paragraph({
                text: `Modèles IA utilisés: ${analysisResult.modelsUsed.join(', ')}`,
                spacing: { before: 400 },
                children: [
                    new TextRun({
                        text: `Modèles IA utilisés: ${analysisResult.modelsUsed.join(', ')}`,
                        italics: true,
                        color: '999999',
                        size: 20
                    })
                ]
            })
        );
    }

    // Footer
    children.push(
        new Paragraph({
            text: 'Document généré automatiquement - Confidentiel',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
                new TextRun({
                    text: 'Document généré automatiquement - Confidentiel',
                    italics: true,
                    color: '999999',
                    size: 18
                })
            ]
        })
    );

    const doc = new Document({
        sections: [{
            properties: {},
            children
        }]
    });

    const blob = await Packer.toBlob(doc);
    const filename = `rapport_analyse_${data.entreprise.siren || 'entreprise'}_${new Date().toISOString().split('T')[0]}.docx`;
    saveAs(blob, filename);
}
