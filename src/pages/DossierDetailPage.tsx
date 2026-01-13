import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Building2,
  User,
  FileText,
  TrendingUp,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  Euro,
  Clock,
  AlertTriangle,
  History,
  ClipboardList
} from 'lucide-react';
import { useDossier, useDossierDocuments, useDossierFinancieres, useUpdateDossierStatus } from '@/hooks/useDossiers';
import { AnalyseManuelle } from '@/components/dossiers/AnalyseManuelle';
import { ScoringView } from '@/components/scoring/ScoringView';
import { DonneesFinancieresForm } from '@/components/dossiers/DonneesFinancieresForm';
import { DocumentsList } from '@/components/dossiers/DocumentsList';
import { calculerScoring } from '@/lib/scoring';
import { toast } from 'sonner';
import { AuditHistory } from '@/components/dossiers/AuditHistory';
import { logAuditAction } from '@/hooks/useAuditLogs';
import { useAuth } from '@/hooks/useAuth';
import { RapportAnalyseContent } from '@/components/rapport-analyse/RapportAnalyseContent';
import { DossierReportGenerator } from '@/components/dossiers/DossierReportGenerator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  brouillon: { label: 'Brouillon', variant: 'outline' },
  en_analyse: { label: 'En analyse', variant: 'secondary' },
  valide: { label: 'Validé', variant: 'default' },
  refuse: { label: 'Refusé', variant: 'destructive' },
  attente_documents: { label: 'Attente documents', variant: 'secondary' },
};

const typeFinancementLabels: Record<string, string> = {
  investissement: 'Investissement',
  tresorerie: 'Trésorerie',
  credit_bail: 'Crédit-bail',
  affacturage: 'Affacturage',
};

export default function DossierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('infos');

  const { data: dossier, isLoading: loadingDossier } = useDossier(id!);
  const { data: documents = [], isLoading: loadingDocs } = useDossierDocuments(id!);
  const { data: financieres = [], isLoading: loadingFin } = useDossierFinancieres(id!);
  const updateStatus = useUpdateDossierStatus();

  const handleValidate = async () => {
    if (!dossier || !id) return;

    // Calculate score first
    const financieresFormatted = financieres.map(df => ({
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

    let score = dossier.score_global;
    let recommandation = dossier.recommandation;

    if (financieresFormatted.length > 0) {
      const scoring = calculerScoring(financieresFormatted, {
        dateCreation: dossier.date_creation ? new Date(dossier.date_creation) : undefined,
        dirigeantExperience: dossier.dirigeant_experience ?? undefined,
        dirigeantFicheFicp: dossier.dirigeant_fiche_ficp ?? false,
        enProcedure: dossier.en_procedure,
        secteurActivite: dossier.secteur_activite ?? undefined,
      });
      score = scoring.scoreGlobal;

      if (scoring.statut === 'accord_favorable') {
        recommandation = 'ACCORD FAVORABLE';
      } else if (scoring.statut === 'accord_conditionne') {
        recommandation = 'ACCORD SOUS CONDITIONS';
      } else {
        recommandation = 'ÉTUDE APPROFONDIE';
      }
    }

    await updateStatus.mutateAsync({
      id,
      status: 'valide',
      score_global: score ?? undefined,
      recommandation: recommandation ?? undefined,
    });
    toast.success('Dossier validé avec succès');
  };

  const handleRefuse = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({
      id,
      status: 'refuse',
      recommandation: 'REFUSÉ',
    });
    toast.success('Dossier refusé');
  };

  const handleRequestDocs = async () => {
    if (!id) return;
    await updateStatus.mutateAsync({
      id,
      status: 'attente_documents',
    });
    toast.success('Statut mis à jour - En attente de documents');
  };

  if (loadingDossier || loadingDocs || loadingFin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!dossier) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <AlertTriangle className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Dossier non trouvé</h2>
          <Button onClick={() => navigate('/dossiers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux dossiers
          </Button>
        </div>
      </Layout>
    );
  }

  const status = statusLabels[dossier.status] || statusLabels.brouillon;

  return (
    <Layout>
      <Header
        title={dossier.raison_sociale}
        subtitle={`SIREN: ${dossier.siren} • ${typeFinancementLabels[dossier.type_financement] || dossier.type_financement}`}
      />

      <div className="p-6 space-y-6">
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dossiers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Badge variant={status.variant} className="text-sm py-1 px-3">
            {status.label}
          </Badge>

          {dossier.score_global && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              Score: {dossier.score_global}/100
            </Badge>
          )}

          <div className="flex-1" />

          {dossier.status !== 'valide' && dossier.status !== 'refuse' && (
            <>
              <Button variant="outline" onClick={handleRequestDocs}>
                <FileText className="h-4 w-4 mr-2" />
                Demander documents
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le refus</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir refuser ce dossier ? Cette action est définitive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefuse} className="bg-destructive text-destructive-foreground">
                      Confirmer le refus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la validation</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir valider ce dossier ? Le scoring sera calculé et enregistré.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleValidate}>
                      Confirmer la validation
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
            <TabsTrigger value="infos" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Infos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="financier" className="gap-2">
              <Euro className="h-4 w-4" />
              <span className="hidden sm:inline">Financier</span>
            </TabsTrigger>
            <TabsTrigger value="analyse" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Analyse</span>
            </TabsTrigger>
            <TabsTrigger value="score" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Score</span>
            </TabsTrigger>
            <TabsTrigger value="rapport" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Rapport</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
          </TabsList>

          {/* Infos Tab */}
          <TabsContent value="infos" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entreprise */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Raison sociale</p>
                      <p className="font-medium">{dossier.raison_sociale}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Forme juridique</p>
                      <p className="font-medium">{dossier.forme_juridique || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SIREN</p>
                      <p className="font-mono">{dossier.siren}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SIRET</p>
                      <p className="font-mono">{dossier.siret || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Code NAF</p>
                      <p className="font-mono">{dossier.code_naf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Secteur</p>
                      <p className="font-medium">{dossier.secteur_activite || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date création</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {dossier.date_creation ? new Date(dossier.date_creation).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Effectif</p>
                      <p className="font-medium">{dossier.nb_salaries ?? '-'} salariés</p>
                    </div>
                  </div>
                  {dossier.adresse_siege && (
                    <div>
                      <p className="text-sm text-muted-foreground">Adresse siège</p>
                      <p className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        {dossier.adresse_siege}
                      </p>
                    </div>
                  )}
                  {dossier.en_procedure && (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                      <p className="text-sm font-medium text-warning">⚠️ Procédure collective en cours</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {dossier.type_procedure} • {dossier.tribunal}
                        {dossier.date_jugement && ` • ${new Date(dossier.date_jugement).toLocaleDateString('fr-FR')}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dirigeant */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Dirigeant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Identité</p>
                      <p className="font-medium text-lg">
                        {dossier.dirigeant_civilite} {dossier.dirigeant_prenom} {dossier.dirigeant_nom}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date de naissance</p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {dossier.dirigeant_date_naissance
                          ? new Date(dossier.dirigeant_date_naissance).toLocaleDateString('fr-FR')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expérience secteur</p>
                      <p className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {dossier.dirigeant_experience ?? '-'} années
                      </p>
                    </div>
                    {dossier.dirigeant_telephone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {dossier.dirigeant_telephone}
                        </p>
                      </div>
                    )}
                    {dossier.dirigeant_email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {dossier.dirigeant_email}
                        </p>
                      </div>
                    )}
                  </div>
                  {dossier.dirigeant_fiche_ficp && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-sm font-medium text-destructive">⛔ Dirigeant fiché FICP</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financement */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Demande de financement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-xl font-bold text-primary">
                        {typeFinancementLabels[dossier.type_financement] || dossier.type_financement}
                      </p>
                    </div>
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-muted-foreground">Montant demandé</p>
                      <p className="text-xl font-bold text-primary">
                        {dossier.montant_demande.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Durée souhaitée</p>
                      <p className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {dossier.duree_mois ?? '-'} mois
                      </p>
                    </div>
                    {dossier.nature_bien && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Nature du bien</p>
                        <p className="text-xl font-bold capitalize">{dossier.nature_bien}</p>
                      </div>
                    )}
                  </div>
                  {dossier.objet_financement && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-1">Objet du financement</p>
                      <p className="p-3 bg-muted rounded-lg">{dossier.objet_financement}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            <DocumentsList dossierId={id!} documents={documents} />
          </TabsContent>

          {/* Financier Tab */}
          <TabsContent value="financier" className="mt-6">
            <DonneesFinancieresForm dossierId={id!} existingData={financieres} />
          </TabsContent>

          {/* Analyse Tab */}
          <TabsContent value="analyse" className="mt-6">
            <AnalyseManuelle
              dossier={dossier}
              documents={documents}
              donneesFinancieres={financieres}
            />
          </TabsContent>

          {/* Score Tab */}
          <TabsContent value="score" className="mt-6">
            <ScoringView dossier={dossier} donneesFinancieres={financieres} />
          </TabsContent>

          {/* Rapport Tab */}
          <TabsContent value="rapport" className="mt-6">
            <div className="space-y-6">
              <DossierReportGenerator dossier={dossier} financieres={financieres} />
              <RapportAnalyseContent dossierId={id!} dossier={dossier} />
            </div>
          </TabsContent>

          {/* Historique Tab */}
          <TabsContent value="historique" className="mt-6">
            <AuditHistory dossierId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
