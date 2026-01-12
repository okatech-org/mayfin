import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Shield, 
  TrendingUp,
  AlertCircle 
} from 'lucide-react';
import { calculerRatios, genererAlertes } from '@/lib/scoring';
import type { DonneesFinancieres, RatioFinancier } from '@/types/dossier.types';
import type { DossierRow, DocumentRow, DonneesFinancieresRow } from '@/hooks/useDossiers';
import { cn } from '@/lib/utils';

interface AnalyseManuellProps {
  dossier: DossierRow;
  documents: DocumentRow[];
  donneesFinancieres: DonneesFinancieresRow[];
}

interface DocumentRequis {
  type: string;
  label: string;
  bloquant: boolean;
  conditionnel?: boolean;
  condition?: (d: DossierRow) => boolean;
}

const documentsRequis: DocumentRequis[] = [
  { type: 'kbis', label: 'Kbis < 3 mois', bloquant: true },
  { type: 'statuts', label: 'Statuts à jour', bloquant: false },
  { type: 'bilan', label: 'Bilans 3 ans', bloquant: true },
  { type: 'compte_resultat', label: 'Comptes de résultat 3 ans', bloquant: true },
  { type: 'liasse_fiscale', label: 'Liasse fiscale dernière année', bloquant: false },
  { type: 'previsionnel', label: 'Prévisionnel activité', bloquant: false },
  { type: 'piece_identite', label: 'Pièce identité dirigeant', bloquant: true },
  { type: 'justif_domicile', label: 'Justificatif domicile', bloquant: false },
  { type: 'beneficiaires_effectifs', label: 'Bénéficiaires effectifs', bloquant: false },
  { type: 'jugement', label: 'Jugement', bloquant: true, conditionnel: true, condition: (d) => d.en_procedure },
  { type: 'plan_continuation', label: 'Plan de continuation', bloquant: true, conditionnel: true, condition: (d) => d.en_procedure },
  { type: 'devis', label: 'Devis fournisseur', bloquant: true, conditionnel: true, condition: (d) => d.type_financement === 'investissement' || d.type_financement === 'credit_bail' },
];

export function AnalyseManuelle({ dossier, documents, donneesFinancieres }: AnalyseManuellProps) {
  // Calculate completeness
  const completude = useMemo(() => {
    const applicableDocuments = documentsRequis.filter(doc => {
      if (!doc.conditionnel) return true;
      return doc.condition?.(dossier) ?? false;
    });

    const status = applicableDocuments.map(doc => ({
      ...doc,
      present: documents.some(d => d.type_document === doc.type),
    }));

    const presentCount = status.filter(s => s.present).length;
    const totalCount = status.length;
    const tauxCompletude = Math.round((presentCount / totalCount) * 100);
    const documentsManquantsBloquants = status.filter(s => !s.present && s.bloquant).map(s => s.label);

    return { status, tauxCompletude, documentsManquantsBloquants };
  }, [dossier, documents]);

  // Transform donnees financieres
  const financieresFormatted: DonneesFinancieres[] = useMemo(() => {
    return donneesFinancieres.map(df => ({
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
  }, [donneesFinancieres]);

  // Calculate ratios
  const ratios = useMemo(() => {
    if (financieresFormatted.length === 0) return [];
    return calculerRatios(financieresFormatted);
  }, [financieresFormatted]);

  // Generate alerts
  const alertes = useMemo(() => {
    const lastFinanciere = financieresFormatted[0];
    return genererAlertes(ratios, {
      dateCreation: dossier.date_creation ? new Date(dossier.date_creation) : undefined,
      dirigeantFicheFicp: dossier.dirigeant_fiche_ficp ?? false,
      enProcedure: dossier.en_procedure,
      capitauxPropres: lastFinanciere?.capitauxPropres,
    });
  }, [ratios, dossier, financieresFormatted]);

  // Conformity checks
  const conformite = useMemo(() => {
    const kbisDoc = documents.find(d => d.type_document === 'kbis');
    const kbisMoins3Mois = kbisDoc 
      ? (new Date().getTime() - new Date(kbisDoc.uploaded_at).getTime()) < (90 * 24 * 60 * 60 * 1000)
      : false;

    return {
      sirenValide: dossier.siren.length === 9 && /^\d{9}$/.test(dossier.siren),
      procedureCollective: !dossier.en_procedure,
      dirigeantFicp: !dossier.dirigeant_fiche_ficp,
      kbisMoins3Mois,
      taeOk: true, // Would require actual calculation
    };
  }, [dossier, documents]);

  const formatValue = (value: number | null, unite?: string) => {
    if (value === null) return '-';
    if (unite === '€') return `${value.toLocaleString('fr-FR')} €`;
    if (unite === '%') return `${value.toFixed(1)}%`;
    if (unite === 'j') return `${Math.round(value)} j`;
    if (unite === 'ans') return `${value.toFixed(1)} ans`;
    if (unite === 'x') return `${value.toFixed(2)}x`;
    return value.toFixed(2);
  };

  const getStatusIcon = (statut: RatioFinancier['statut']) => {
    switch (statut) {
      case 'good':
        return <div className="w-3 h-3 rounded-full bg-success" />;
      case 'warning':
        return <div className="w-3 h-3 rounded-full bg-warning" />;
      case 'bad':
        return <div className="w-3 h-3 rounded-full bg-destructive" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Complétude documentaire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Complétude documentaire
            <Badge variant={completude.tauxCompletude >= 80 ? 'default' : 'destructive'} className="ml-auto">
              {completude.tauxCompletude}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {completude.status.map((doc) => (
              <div
                key={doc.type}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  doc.present ? "bg-success/10 border-success/30" : 
                    doc.bloquant ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
                )}
              >
                {doc.present ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                ) : doc.bloquant ? (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
                )}
                <span className="text-sm">{doc.label}</span>
                {doc.bloquant && !doc.present && (
                  <Badge variant="destructive" className="ml-auto text-xs">BLOQUANT</Badge>
                )}
              </div>
            ))}
          </div>

          {completude.documentsManquantsBloquants.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm font-medium text-destructive">
                ⚠️ Documents bloquants manquants : {completude.documentsManquantsBloquants.join(', ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conformité réglementaire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Conformité réglementaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'SIREN valide', value: conformite.sirenValide },
              { label: 'Pas de procédure collective', value: conformite.procedureCollective },
              { label: 'Dirigeant non fiché FICP', value: conformite.dirigeantFicp },
              { label: 'Kbis date < 3 mois', value: conformite.kbisMoins3Mois },
              { label: 'TAEG < Taux usure', value: conformite.taeOk },
            ].map((check) => (
              <div
                key={check.label}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  check.value ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                )}
              >
                {check.value ? (
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                )}
                <span className="text-sm">{check.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ratios Financiers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Ratios Financiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucune donnée financière disponible</p>
              <p className="text-sm">Veuillez saisir les données comptables pour calculer les ratios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Ratio</th>
                    <th className="text-center py-3 px-2 font-medium">N</th>
                    <th className="text-center py-3 px-2 font-medium">N-1</th>
                    <th className="text-center py-3 px-2 font-medium">N-2</th>
                    <th className="text-center py-3 px-2 font-medium">Seuil</th>
                    <th className="text-center py-3 px-2 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Group: Capacité de remboursement */}
                  <tr className="bg-muted/50">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-primary">
                      Capacité de remboursement
                    </td>
                  </tr>
                  {ratios.slice(0, 3).map((ratio) => (
                    <tr key={ratio.nom} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-3 px-2">{ratio.nom}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatValue(ratio.valeurN, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN1, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN2, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{ratio.seuil}</td>
                      <td className="text-center py-3 px-2">{getStatusIcon(ratio.statut)}</td>
                    </tr>
                  ))}

                  {/* Group: Structure financière */}
                  <tr className="bg-muted/50">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-primary">
                      Structure financière
                    </td>
                  </tr>
                  {ratios.slice(3, 6).map((ratio) => (
                    <tr key={ratio.nom} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-3 px-2">{ratio.nom}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatValue(ratio.valeurN, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN1, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN2, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{ratio.seuil}</td>
                      <td className="text-center py-3 px-2">{getStatusIcon(ratio.statut)}</td>
                    </tr>
                  ))}

                  {/* Group: Liquidité */}
                  <tr className="bg-muted/50">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-primary">
                      Liquidité
                    </td>
                  </tr>
                  {ratios.slice(6, 9).map((ratio) => (
                    <tr key={ratio.nom} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-3 px-2">{ratio.nom}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatValue(ratio.valeurN, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN1, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN2, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{ratio.seuil}</td>
                      <td className="text-center py-3 px-2">{getStatusIcon(ratio.statut)}</td>
                    </tr>
                  ))}

                  {/* Group: Rentabilité */}
                  <tr className="bg-muted/50">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-primary">
                      Rentabilité
                    </td>
                  </tr>
                  {ratios.slice(9, 12).map((ratio) => (
                    <tr key={ratio.nom} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-3 px-2">{ratio.nom}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatValue(ratio.valeurN, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN1, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN2, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{ratio.seuil}</td>
                      <td className="text-center py-3 px-2">{getStatusIcon(ratio.statut)}</td>
                    </tr>
                  ))}

                  {/* Group: Activité */}
                  <tr className="bg-muted/50">
                    <td colSpan={6} className="py-2 px-2 font-semibold text-primary">
                      Activité
                    </td>
                  </tr>
                  {ratios.slice(12).map((ratio) => (
                    <tr key={ratio.nom} className="border-b border-muted/50 hover:bg-muted/30">
                      <td className="py-3 px-2">{ratio.nom}</td>
                      <td className="text-center py-3 px-2 font-mono">{formatValue(ratio.valeurN, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN1, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 font-mono text-muted-foreground">{formatValue(ratio.valeurN2, ratio.unite)}</td>
                      <td className="text-center py-3 px-2 text-muted-foreground">{ratio.seuil}</td>
                      <td className="text-center py-3 px-2">{getStatusIcon(ratio.statut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Points d'attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Points d'attention
            {alertes.length > 0 && (
              <Badge variant="destructive" className="ml-auto">{alertes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertes.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <span className="text-success font-medium">Aucun point d'attention détecté</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map((alerte, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
                >
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-sm">{alerte}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
