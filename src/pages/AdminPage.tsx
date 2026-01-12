import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { 
  Trash2, 
  RotateCcw, 
  Building2, 
  Calendar, 
  AlertCircle,
  Loader2,
  Search,
  Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeletedDossiers, useRestoreDossier } from '@/hooks/useDossiers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminPage() {
  const { data: deletedDossiers, isLoading, error } = useDeletedDossiers();
  const restoreDossier = useRestoreDossier();
  const [search, setSearch] = useState('');
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [dossierToRestore, setDossierToRestore] = useState<{
    id: string;
    raison_sociale: string;
    siren: string;
  } | null>(null);

  const filteredDossiers = deletedDossiers?.filter(
    (dossier) =>
      dossier.raison_sociale.toLowerCase().includes(search.toLowerCase()) ||
      dossier.siren.includes(search) ||
      (dossier.dirigeant_nom + ' ' + dossier.dirigeant_prenom)
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const handleRestoreClick = (dossier: {
    id: string;
    raison_sociale: string;
    siren: string;
  }) => {
    setDossierToRestore(dossier);
    setRestoreDialogOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (dossierToRestore) {
      await restoreDossier.mutateAsync(dossierToRestore.id);
      setRestoreDialogOpen(false);
      setDossierToRestore(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des dossiers supprimés et restauration
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dossiers supprimés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">
                  {deletedDossiers?.length ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restaurations ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">0</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Montant total archivé
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  }).format(
                    deletedDossiers?.reduce(
                      (sum, d) => sum + d.montant_demande,
                      0
                    ) ?? 0
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deleted Dossiers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Dossiers supprimés
            </CardTitle>
            <CardDescription>
              Ces dossiers ont été supprimés et peuvent être restaurés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, SIREN ou dirigeant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Erreur de chargement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Impossible de charger les dossiers supprimés
                </p>
              </div>
            ) : filteredDossiers?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  Aucun dossier supprimé
                </h3>
                <p className="text-sm text-muted-foreground">
                  Les dossiers supprimés apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>SIREN</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Supprimé le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDossiers?.map((dossier) => (
                      <TableRow key={dossier.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
                              <Building2 className="h-4 w-4 text-destructive" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {dossier.raison_sociale}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {dossier.dirigeant_nom} {dossier.dirigeant_prenom}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm text-muted-foreground">
                            {dossier.siren}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: 'EUR',
                              maximumFractionDigits: 0,
                            }).format(dossier.montant_demande)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {dossier.deleted_at
                                ? formatDistanceToNow(
                                    new Date(dossier.deleted_at),
                                    { addSuffix: true, locale: fr }
                                  )
                                : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreClick(dossier)}
                            disabled={restoreDossier.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Restore confirmation dialog */}
        <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la restauration</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir restaurer le dossier{' '}
                <strong>{dossierToRestore?.raison_sociale}</strong> (SIREN:{' '}
                {dossierToRestore?.siren}) ?
                <br />
                <br />
                Le dossier sera de nouveau visible dans la liste des dossiers
                actifs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmRestore}
                disabled={restoreDossier.isPending}
              >
                {restoreDossier.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restauration...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurer
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
