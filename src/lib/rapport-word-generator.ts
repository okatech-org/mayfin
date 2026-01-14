import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } from 'docx';
import { saveAs } from 'file-saver';
import type { AnalysisResult } from '@/hooks/useDocumentAnalysis';
import type { DossierRow } from '@/hooks/useDossiers';
import { getApplicableQuestions } from '@/lib/questionnaire-bnp';
import { SECTIONS as QUESTIONNAIRE_SECTIONS } from '@/types/questionnaire.types';

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
    const besoin = analysisResult.besoinAnalyse;

    const children: (Paragraph | Table)[] = [];

    // Title
    children.push(
        new Paragraph({
            text: 'ANALYSE DE FINANCEMENT',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        })
    );

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({
                    text: `Rapport d'étude généré le ${formatDate()}`,
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

        children.push(scoreTable);
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

    // Analyse du Besoin
    if (besoin) {
        children.push(
            new Paragraph({
                text: 'ANALYSE DU BESOIN CLIENT',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        // Investment summary
        const besoinInfo = [
            ['Type d\'investissement', besoin.typeInvestissement || besoin.categorieInvestissement || '-'],
            ['Apport client', formatCurrency(besoin.apportClient)],
            ['Taux d\'apport', `${besoin.tauxApport?.toFixed(1) || 0}%`],
            ['Montant financé', formatCurrency(besoin.montantFinance)],
            ['Mensualité estimée', formatCurrency(besoin.mensualiteEstimee)],
            ['Capacité de remboursement', formatCurrency(besoin.capaciteRemboursement)],
            ['Score adéquation', `${besoin.adequationBesoin || 0}/100`]
        ];

        besoinInfo.forEach(([label, value]) => {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${label}: `, bold: true }),
                        new TextRun({ text: value })
                    ],
                    spacing: { after: 80 }
                })
            );
        });

        // Justification
        if (besoin.justificationAdequation) {
            children.push(
                new Paragraph({
                    text: 'Justification:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            children.push(
                new Paragraph({
                    text: besoin.justificationAdequation,
                    spacing: { after: 200 }
                })
            );
        }

        // Product recommendation
        if (besoin.produitRecommande) {
            children.push(
                new Paragraph({
                    text: 'Produit recommandé:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: besoin.produitRecommande.nom, bold: true, size: 28 })
                    ],
                    spacing: { after: 50 }
                })
            );

            children.push(
                new Paragraph({
                    text: besoin.produitRecommande.type || '',
                    spacing: { after: 150 }
                })
            );

            if (besoin.produitRecommande.avantages?.length > 0) {
                children.push(
                    new Paragraph({
                        text: 'Avantages:',
                        spacing: { before: 100, after: 50 }
                    })
                );
                besoin.produitRecommande.avantages.forEach(advantage => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `✓ ${advantage}`, color: '27AE60' })],
                            spacing: { after: 40 }
                        })
                    );
                });
            }

            if (besoin.produitRecommande.conditions?.length > 0) {
                children.push(
                    new Paragraph({
                        text: 'Conditions:',
                        spacing: { before: 100, after: 50 }
                    })
                );
                besoin.produitRecommande.conditions.forEach(condition => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${condition}` })],
                            spacing: { after: 40 }
                        })
                    );
                });
            }

            if (besoin.produitRecommande.alternative) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Alternative: ', bold: true }),
                            new TextRun({ text: `${besoin.produitRecommande.alternative.nom} - ${besoin.produitRecommande.alternative.raison}`, italics: true, color: '666666' })
                        ],
                        spacing: { before: 100, after: 100 }
                    })
                );
            }
        }

        // Alerts
        if (besoin.alertes?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Alertes:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            besoin.alertes.forEach(alerte => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `⚠ ${alerte}`, color: 'E74C3C' })],
                        spacing: { after: 50 }
                    })
                );
            });
        }

        // Structuring recommendations
        if (besoin.recommandationsStructuration?.length > 0) {
            children.push(
                new Paragraph({
                    text: 'Recommandations de structuration:',
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 100 }
                })
            );
            besoin.recommandationsStructuration.forEach(rec => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: `→ ${rec}` })],
                        spacing: { after: 50 }
                    })
                );
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

        children.push(financeTable);
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
                text: 'SYNTHÈSE',
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

    // ============ QUESTIONNAIRE BNP (if available) ============
    const questionnaireResponses = analysisResult.questionnaireResponses;
    if (questionnaireResponses && Object.keys(questionnaireResponses).length > 0) {
        children.push(
            new Paragraph({
                text: 'QUESTIONNAIRE D\'ANALYSE BNP',
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            })
        );

        // Get applicable questions
        const typeFinancement = data.financement?.typeInvestissement?.toLowerCase();
        const questions = getApplicableQuestions(typeFinancement);

        // Group by section
        let currentSection = 0;
        for (const question of questions) {
            const value = questionnaireResponses[question.code];

            // Skip unanswered
            if (value === undefined || value === null || value === '') continue;

            // Section header
            if (question.section !== currentSection) {
                currentSection = question.section;
                const section = QUESTIONNAIRE_SECTIONS.find(s => s.id === currentSection);
                if (section) {
                    children.push(
                        new Paragraph({
                            text: section.label,
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 100 }
                        })
                    );
                }
            }

            // Question + answer
            let displayValue: string;
            let valueColor = '000000';
            if (typeof value === 'boolean') {
                displayValue = value ? '✓ Oui' : '✗ Non';
                valueColor = value ? '27AE60' : 'E74C3C';
            } else {
                displayValue = String(value);
            }

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: question.label, bold: true }),
                    ],
                    spacing: { before: 100, after: 50 }
                })
            );

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `→ ${displayValue}`, color: valueColor }),
                    ],
                    spacing: { after: 50 }
                })
            );

            // Alert if applicable
            if (question.alertIfYes && value === true) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `⚠ ${question.alertIfYes}`, color: 'E74C3C', italics: true, size: 18 }),
                        ],
                        spacing: { after: 50 }
                    })
                );
            }
            if (question.alertIfNo && value === false) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `⚠ ${question.alertIfNo}`, color: 'E74C3C', italics: true, size: 18 }),
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            // Sub-questions
            if (question.subQuestions) {
                for (const sq of question.subQuestions) {
                    const sqValue = questionnaireResponses[sq.code];
                    if (sqValue === undefined || sqValue === null || sqValue === '') continue;

                    if (sq.condition?.field) {
                        const parentValue = questionnaireResponses[sq.condition.field];
                        if (parentValue !== sq.condition.value) continue;
                    }

                    children.push(
                        new Paragraph({
                            children: [
                                new TextRun({ text: `   ↳ ${sq.label}: `, italics: true, size: 20 }),
                                new TextRun({ text: String(sqValue), size: 20 }),
                            ],
                            spacing: { after: 30 }
                        })
                    );
                }
            }
        }
    }

    // Models used - skip for confidentiality
    // (Section removed)

    children.push(
        new Paragraph({
            text: 'Document confidentiel - Usage interne',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            children: [
                new TextRun({
                    text: 'Document confidentiel - Usage interne',
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
