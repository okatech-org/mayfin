import type { DonneesFinancieres, RatioFinancier, ScoreDetail, Facteur, ScoringResult } from '@/types/dossier.types';

// Calculate all 15 financial ratios
export function calculerRatios(data: DonneesFinancieres[]): RatioFinancier[] {
  const [n, n1, n2] = data.sort((a, b) => b.anneeExercice - a.anneeExercice);
  
  const calcRatio = (fn: (d: DonneesFinancieres) => number | null, exercice?: DonneesFinancieres) => {
    if (!exercice) return null;
    try {
      return fn(exercice);
    } catch {
      return null;
    }
  };

  const ratios: RatioFinancier[] = [
    // Capacité de remboursement
    {
      nom: 'Dettes/CAF',
      valeurN: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capaciteAutofinancement ?? 1), n),
      valeurN1: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capaciteAutofinancement ?? 1), n1),
      valeurN2: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capaciteAutofinancement ?? 1), n2),
      seuil: '≤ 3 ans',
      statut: 'good',
      unite: 'ans'
    },
    {
      nom: 'DSCR (EBITDA/Service dette)',
      valeurN: calcRatio(d => (d.ebitda ?? 0) / ((d.dettesFinancieres ?? 0) * 0.15), n),
      valeurN1: calcRatio(d => (d.ebitda ?? 0) / ((d.dettesFinancieres ?? 0) * 0.15), n1),
      valeurN2: calcRatio(d => (d.ebitda ?? 0) / ((d.dettesFinancieres ?? 0) * 0.15), n2),
      seuil: '≥ 1,5',
      statut: 'good',
      unite: 'x'
    },
    {
      nom: 'Taux d\'endettement',
      valeurN: calcRatio(d => ((d.dettesFinancieres ?? 0) / (d.totalPassif ?? 1)) * 100, n),
      valeurN1: calcRatio(d => ((d.dettesFinancieres ?? 0) / (d.totalPassif ?? 1)) * 100, n1),
      valeurN2: calcRatio(d => ((d.dettesFinancieres ?? 0) / (d.totalPassif ?? 1)) * 100, n2),
      seuil: '≤ 50%',
      statut: 'good',
      unite: '%'
    },
    // Structure financière
    {
      nom: 'Autonomie financière',
      valeurN: calcRatio(d => ((d.capitauxPropres ?? 0) / (d.totalPassif ?? 1)) * 100, n),
      valeurN1: calcRatio(d => ((d.capitauxPropres ?? 0) / (d.totalPassif ?? 1)) * 100, n1),
      valeurN2: calcRatio(d => ((d.capitauxPropres ?? 0) / (d.totalPassif ?? 1)) * 100, n2),
      seuil: '≥ 20%',
      statut: 'good',
      unite: '%'
    },
    {
      nom: 'Gearing (Dettes/CP)',
      valeurN: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capitauxPropres ?? 1), n),
      valeurN1: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capitauxPropres ?? 1), n1),
      valeurN2: calcRatio(d => (d.dettesFinancieres ?? 0) / (d.capitauxPropres ?? 1), n2),
      seuil: '≤ 1',
      statut: 'good',
      unite: 'x'
    },
    {
      nom: 'Fonds de roulement net',
      valeurN: calcRatio(d => (d.capitauxPropres ?? 0) + (d.dettesFinancieres ?? 0) - ((d.totalActif ?? 0) - (d.actifCirculant ?? 0)), n),
      valeurN1: calcRatio(d => (d.capitauxPropres ?? 0) + (d.dettesFinancieres ?? 0) - ((d.totalActif ?? 0) - (d.actifCirculant ?? 0)), n1),
      valeurN2: calcRatio(d => (d.capitauxPropres ?? 0) + (d.dettesFinancieres ?? 0) - ((d.totalActif ?? 0) - (d.actifCirculant ?? 0)), n2),
      seuil: '> 0',
      statut: 'good',
      unite: '€'
    },
    // Liquidité
    {
      nom: 'Liquidité générale',
      valeurN: calcRatio(d => (d.actifCirculant ?? 0) / (d.passifCirculant ?? 1), n),
      valeurN1: calcRatio(d => (d.actifCirculant ?? 0) / (d.passifCirculant ?? 1), n1),
      valeurN2: calcRatio(d => (d.actifCirculant ?? 0) / (d.passifCirculant ?? 1), n2),
      seuil: '≥ 1',
      statut: 'good',
      unite: 'x'
    },
    {
      nom: 'Liquidité réduite',
      valeurN: calcRatio(d => ((d.actifCirculant ?? 0) - (d.stocks ?? 0)) / (d.passifCirculant ?? 1), n),
      valeurN1: calcRatio(d => ((d.actifCirculant ?? 0) - (d.stocks ?? 0)) / (d.passifCirculant ?? 1), n1),
      valeurN2: calcRatio(d => ((d.actifCirculant ?? 0) - (d.stocks ?? 0)) / (d.passifCirculant ?? 1), n2),
      seuil: '≥ 0,8',
      statut: 'good',
      unite: 'x'
    },
    {
      nom: 'BFR en jours CA',
      valeurN: calcRatio(d => (((d.stocks ?? 0) + (d.creancesClients ?? 0) - (d.dettesFournisseurs ?? 0)) / (d.chiffreAffaires ?? 1)) * 365, n),
      valeurN1: calcRatio(d => (((d.stocks ?? 0) + (d.creancesClients ?? 0) - (d.dettesFournisseurs ?? 0)) / (d.chiffreAffaires ?? 1)) * 365, n1),
      valeurN2: calcRatio(d => (((d.stocks ?? 0) + (d.creancesClients ?? 0) - (d.dettesFournisseurs ?? 0)) / (d.chiffreAffaires ?? 1)) * 365, n2),
      seuil: '< 60 j',
      statut: 'good',
      unite: 'j'
    },
    // Rentabilité
    {
      nom: 'Marge EBE',
      valeurN: calcRatio(d => ((d.ebitda ?? 0) / (d.chiffreAffaires ?? 1)) * 100, n),
      valeurN1: calcRatio(d => ((d.ebitda ?? 0) / (d.chiffreAffaires ?? 1)) * 100, n1),
      valeurN2: calcRatio(d => ((d.ebitda ?? 0) / (d.chiffreAffaires ?? 1)) * 100, n2),
      seuil: '≥ 5%',
      statut: 'good',
      unite: '%'
    },
    {
      nom: 'Marge EBIT',
      valeurN: calcRatio(d => ((d.ebitda ?? 0) * 0.85 / (d.chiffreAffaires ?? 1)) * 100, n),
      valeurN1: calcRatio(d => ((d.ebitda ?? 0) * 0.85 / (d.chiffreAffaires ?? 1)) * 100, n1),
      valeurN2: calcRatio(d => ((d.ebitda ?? 0) * 0.85 / (d.chiffreAffaires ?? 1)) * 100, n2),
      seuil: '≥ 2%',
      statut: 'good',
      unite: '%'
    },
    {
      nom: 'ROE',
      valeurN: calcRatio(d => ((d.resultatNet ?? 0) / (d.capitauxPropres ?? 1)) * 100, n),
      valeurN1: calcRatio(d => ((d.resultatNet ?? 0) / (d.capitauxPropres ?? 1)) * 100, n1),
      valeurN2: calcRatio(d => ((d.resultatNet ?? 0) / (d.capitauxPropres ?? 1)) * 100, n2),
      seuil: '≥ 10%',
      statut: 'good',
      unite: '%'
    },
    // Activité
    {
      nom: 'Croissance CA',
      valeurN: n && n1 ? (((n.chiffreAffaires ?? 0) - (n1.chiffreAffaires ?? 0)) / (n1.chiffreAffaires ?? 1)) * 100 : null,
      valeurN1: n1 && n2 ? (((n1.chiffreAffaires ?? 0) - (n2.chiffreAffaires ?? 0)) / (n2.chiffreAffaires ?? 1)) * 100 : null,
      valeurN2: null,
      seuil: '≥ 0%',
      statut: 'good',
      unite: '%'
    },
    {
      nom: 'Rotation stocks',
      valeurN: calcRatio(d => ((d.stocks ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n),
      valeurN1: calcRatio(d => ((d.stocks ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n1),
      valeurN2: calcRatio(d => ((d.stocks ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n2),
      seuil: 'secteur',
      statut: 'good',
      unite: 'j'
    },
    {
      nom: 'Délai paiement clients',
      valeurN: calcRatio(d => ((d.creancesClients ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n),
      valeurN1: calcRatio(d => ((d.creancesClients ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n1),
      valeurN2: calcRatio(d => ((d.creancesClients ?? 0) / (d.chiffreAffaires ?? 1)) * 365, n2),
      seuil: '< 60 j',
      statut: 'good',
      unite: 'j'
    },
  ];

  // Calculate status for each ratio
  return ratios.map(r => ({
    ...r,
    statut: getStatut(r)
  }));
}

function getStatut(ratio: RatioFinancier): 'good' | 'warning' | 'bad' {
  if (ratio.valeurN === null) return 'warning';
  
  const val = ratio.valeurN;
  
  switch (ratio.nom) {
    case 'Dettes/CAF':
      return val <= 3 ? 'good' : val <= 5 ? 'warning' : 'bad';
    case 'DSCR (EBITDA/Service dette)':
      return val >= 1.5 ? 'good' : val >= 1 ? 'warning' : 'bad';
    case 'Taux d\'endettement':
      return val <= 50 ? 'good' : val <= 70 ? 'warning' : 'bad';
    case 'Autonomie financière':
      return val >= 20 ? 'good' : val >= 10 ? 'warning' : 'bad';
    case 'Gearing (Dettes/CP)':
      return val <= 1 ? 'good' : val <= 2 ? 'warning' : 'bad';
    case 'Fonds de roulement net':
      return val > 0 ? 'good' : 'bad';
    case 'Liquidité générale':
      return val >= 1 ? 'good' : val >= 0.8 ? 'warning' : 'bad';
    case 'Liquidité réduite':
      return val >= 0.8 ? 'good' : val >= 0.5 ? 'warning' : 'bad';
    case 'BFR en jours CA':
      return val < 60 ? 'good' : val < 90 ? 'warning' : 'bad';
    case 'Marge EBE':
      return val >= 5 ? 'good' : val >= 2 ? 'warning' : 'bad';
    case 'Marge EBIT':
      return val >= 2 ? 'good' : val >= 0 ? 'warning' : 'bad';
    case 'ROE':
      return val >= 10 ? 'good' : val >= 5 ? 'warning' : 'bad';
    case 'Croissance CA':
      return val >= 0 ? 'good' : val >= -5 ? 'warning' : 'bad';
    case 'Rotation stocks':
      return val <= 60 ? 'good' : val <= 90 ? 'warning' : 'bad';
    case 'Délai paiement clients':
      return val < 60 ? 'good' : val < 90 ? 'warning' : 'bad';
    default:
      return 'warning';
  }
}

// Score a single criterion
function scoreCriterion(
  name: string,
  value: number | null,
  poids: number,
  thresholds: { score5: number; score4: number; score3: number; score2: number },
  higherIsBetter: boolean
): ScoreDetail {
  if (value === null) {
    return {
      critere: name,
      poids,
      scoreObtenu: 2,
      points: (2 * poids) / 5,
      justification: 'Données insuffisantes'
    };
  }

  let score: number;
  if (higherIsBetter) {
    if (value >= thresholds.score5) score = 5;
    else if (value >= thresholds.score4) score = 4;
    else if (value >= thresholds.score3) score = 3;
    else if (value >= thresholds.score2) score = 2;
    else score = 1;
  } else {
    if (value <= thresholds.score5) score = 5;
    else if (value <= thresholds.score4) score = 4;
    else if (value <= thresholds.score3) score = 3;
    else if (value <= thresholds.score2) score = 2;
    else score = 1;
  }

  return {
    critere: name,
    poids,
    scoreObtenu: score,
    points: (score * poids) / 5,
    justification: `Valeur: ${value.toFixed(1)}`
  };
}

// Calculate full scoring
export function calculerScoring(
  data: DonneesFinancieres[],
  dossierInfo: {
    dateCreation?: Date;
    dirigeantExperience?: number;
    dirigeantFicheFicp?: boolean;
    enProcedure?: boolean;
    secteurActivite?: string;
  }
): ScoringResult {
  const ratios = calculerRatios(data);
  
  const autonomie = ratios.find(r => r.nom === 'Autonomie financière')?.valeurN ?? null;
  const cafDettes = ratios.find(r => r.nom === 'Dettes/CAF')?.valeurN ?? null;
  const liquidite = ratios.find(r => r.nom === 'Liquidité réduite')?.valeurN ?? null;
  const margeEbe = ratios.find(r => r.nom === 'Marge EBE')?.valeurN ?? null;
  
  // Calculate company age
  const anciennete = dossierInfo.dateCreation 
    ? Math.floor((new Date().getTime() - new Date(dossierInfo.dateCreation).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : 0;

  // Calculate scores
  const details: ScoreDetail[] = [
    scoreCriterion('Autonomie financière', autonomie, 20, 
      { score5: 35, score4: 25, score3: 15, score2: 10 }, true),
    scoreCriterion('CAF/Dettes', cafDettes, 20, 
      { score5: 2, score4: 3, score3: 4, score2: 6 }, false),
    scoreCriterion('Liquidité réduite', liquidite, 15, 
      { score5: 1.5, score4: 1.2, score3: 0.8, score2: 0.5 }, true),
    scoreCriterion('Marge EBE', margeEbe, 15, 
      { score5: 10, score4: 7, score3: 5, score2: 2 }, true),
    {
      critere: 'Historique comportemental',
      poids: 15,
      scoreObtenu: dossierInfo.dirigeantFicheFicp ? 1 : (dossierInfo.enProcedure ? 2 : 4),
      points: ((dossierInfo.dirigeantFicheFicp ? 1 : (dossierInfo.enProcedure ? 2 : 4)) * 15) / 5,
      justification: dossierInfo.dirigeantFicheFicp ? 'Fiché FICP' : (dossierInfo.enProcedure ? 'Procédure collective en cours' : 'Historique correct')
    },
    {
      critere: 'Ancienneté entreprise',
      poids: 10,
      scoreObtenu: anciennete >= 5 ? 5 : anciennete >= 3 ? 4 : anciennete >= 2 ? 3 : 2,
      points: ((anciennete >= 5 ? 5 : anciennete >= 3 ? 4 : anciennete >= 2 ? 3 : 2) * 10) / 5,
      justification: `${anciennete} années d'existence`
    },
    {
      critere: 'Qualité dirigeant',
      poids: 5,
      scoreObtenu: (dossierInfo.dirigeantExperience ?? 0) >= 10 ? 5 : (dossierInfo.dirigeantExperience ?? 0) >= 5 ? 4 : (dossierInfo.dirigeantExperience ?? 0) >= 3 ? 3 : 2,
      points: (((dossierInfo.dirigeantExperience ?? 0) >= 10 ? 5 : (dossierInfo.dirigeantExperience ?? 0) >= 5 ? 4 : (dossierInfo.dirigeantExperience ?? 0) >= 3 ? 3 : 2) * 5) / 5,
      justification: `${dossierInfo.dirigeantExperience ?? 0} années d'expérience`
    },
  ];

  const scoreGlobal = Math.round(details.reduce((sum, d) => sum + d.points, 0));

  // Determine status
  let statut: ScoringResult['statut'];
  if (scoreGlobal >= 80) statut = 'accord_favorable';
  else if (scoreGlobal >= 60) statut = 'accord_conditionne';
  else if (scoreGlobal >= 40) statut = 'etude_approfondie';
  else statut = 'refus';

  // Extract factors
  const sortedDetails = [...details].sort((a, b) => b.points - a.points);
  
  const facteursPositifs: Facteur[] = sortedDetails
    .filter(d => d.scoreObtenu >= 4)
    .slice(0, 5)
    .map(d => ({
      description: `${d.critere}: ${d.justification}`,
      impact: d.points,
      type: 'positive' as const
    }));

  const facteursNegatifs: Facteur[] = sortedDetails
    .filter(d => d.scoreObtenu <= 2)
    .slice(0, 5)
    .map(d => ({
      description: `${d.critere}: ${d.justification}`,
      impact: -d.points,
      type: 'negative' as const
    }));

  return {
    scoreGlobal,
    statut,
    details,
    facteursPositifs,
    facteursNegatifs,
    recommandation: {
      montantFinancable: 0,
      typeFinancement: '',
      duree: 0,
      garantiesRequises: [],
      conditionsParticulieres: [],
      pointsVigilance: [],
      decision: ''
    }
  };
}

// Generate alerts based on ratios and dossier data
export function genererAlertes(
  ratios: RatioFinancier[],
  dossierInfo: {
    dateCreation?: Date;
    dirigeantFicheFicp?: boolean;
    enProcedure?: boolean;
    capitauxPropres?: number;
  }
): string[] {
  const alertes: string[] = [];

  // Check capitaux propres
  if (dossierInfo.capitauxPropres !== undefined && dossierInfo.capitauxPropres < 0) {
    alertes.push('Capitaux propres négatifs');
  }

  // Check FICP
  if (dossierInfo.dirigeantFicheFicp) {
    alertes.push('Dirigeant fiché FICP');
  }

  // Check procédure collective
  if (dossierInfo.enProcedure) {
    alertes.push('Procédure collective en cours');
  }

  // Check company age
  if (dossierInfo.dateCreation) {
    const years = Math.floor((new Date().getTime() - new Date(dossierInfo.dateCreation).getTime()) / (1000 * 60 * 60 * 24 * 365));
    if (years < 2) {
      alertes.push('Entreprise de moins de 2 ans d\'ancienneté');
    }
  }

  // Check ratios
  const liquidite = ratios.find(r => r.nom === 'Liquidité réduite');
  if (liquidite?.valeurN !== null && liquidite?.valeurN !== undefined && liquidite.valeurN < 0.5) {
    alertes.push('Liquidité réduite insuffisante (< 0,5)');
  }

  const dscr = ratios.find(r => r.nom === 'DSCR (EBITDA/Service dette)');
  if (dscr?.valeurN !== null && dscr?.valeurN !== undefined && dscr.valeurN < 1) {
    alertes.push('DSCR < 1 (service dette non couvert)');
  }

  const margeEbe = ratios.find(r => r.nom === 'Marge EBE');
  if (margeEbe?.valeurN !== null && margeEbe?.valeurN !== undefined && margeEbe.valeurN < 2) {
    alertes.push('Marge EBE très faible (< 2%)');
  }

  const croissance = ratios.find(r => r.nom === 'Croissance CA');
  if (croissance?.valeurN !== null && croissance?.valeurN !== undefined && croissance.valeurN < -5 &&
      croissance?.valeurN1 !== null && croissance?.valeurN1 !== undefined && croissance.valeurN1 < -5) {
    alertes.push('Croissance CA négative 2 années consécutives');
  }

  const autonomie = ratios.find(r => r.nom === 'Autonomie financière');
  if (autonomie?.valeurN !== null && autonomie?.valeurN1 !== null && 
      autonomie?.valeurN !== undefined && autonomie?.valeurN1 !== undefined) {
    if ((autonomie.valeurN1 - autonomie.valeurN) > 5) {
      alertes.push('Dégradation de l\'autonomie financière > 5 points');
    }
  }

  return alertes;
}
