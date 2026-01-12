import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Dossier, DossierStatus } from '@/types/dossier.types';

const statusConfig: Record<DossierStatus, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  en_analyse: { label: 'En analyse', className: 'bg-info/10 text-info border-info/20' },
  valide: { label: 'Validé', className: 'bg-success/10 text-success border-success/20' },
  refuse: { label: 'Refusé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  attente_documents: { label: 'Attente docs', className: 'bg-warning/10 text-warning border-warning/20' },
};

interface RecentDossiersProps {
  dossiers: Dossier[];
}

export function RecentDossiers({ dossiers }: RecentDossiersProps) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Derniers dossiers</h3>
          <p className="text-sm text-muted-foreground">Activité récente</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dossiers" className="gap-2">
            Voir tout <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="divide-y divide-border">
        {dossiers.map((dossier) => {
          const status = statusConfig[dossier.status];
          return (
            <Link
              key={dossier.id}
              to={`/dossiers/${dossier.id}`}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{dossier.raisonSociale}</p>
                <p className="text-sm text-muted-foreground">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(dossier.montantDemande)}
                  {' • '}
                  {dossier.typeFinancement.replace('_', ' ')}
                </p>
              </div>
              <Badge variant="outline" className={cn('shrink-0', status.className)}>
                {status.label}
              </Badge>
              {dossier.scoreGlobal !== undefined && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-foreground">{dossier.scoreGlobal}/100</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
