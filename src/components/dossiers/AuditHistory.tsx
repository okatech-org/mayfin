import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, User, FileText, Settings, CheckCircle, XCircle, Upload, Download, Edit, Plus, Trash2 } from 'lucide-react';
import { useAuditLogs, AuditLogRow } from '@/hooks/useAuditLogs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AuditHistoryProps {
  dossierId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  upload: <Upload className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  validate: <CheckCircle className="h-4 w-4" />,
  reject: <XCircle className="h-4 w-4" />,
  score: <Settings className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  upload: 'Upload document',
  download: 'Téléchargement',
  validate: 'Validation',
  reject: 'Refus',
  score: 'Calcul scoring',
  status_change: 'Changement statut',
  document_request: 'Demande documents',
};

const entityLabels: Record<string, string> = {
  dossier: 'Dossier',
  document: 'Document',
  donnees_financieres: 'Données financières',
  scoring: 'Scoring',
};

const actionColors: Record<string, string> = {
  create: 'bg-success/10 text-success border-success/20',
  update: 'bg-info/10 text-info border-info/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  upload: 'bg-primary/10 text-primary border-primary/20',
  download: 'bg-muted text-muted-foreground',
  validate: 'bg-success/10 text-success border-success/20',
  reject: 'bg-destructive/10 text-destructive border-destructive/20',
  score: 'bg-warning/10 text-warning border-warning/20',
  status_change: 'bg-info/10 text-info border-info/20',
  document_request: 'bg-warning/10 text-warning border-warning/20',
};

function formatChanges(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null): string[] {
  const changes: string[] = [];
  
  if (!oldValues && newValues) {
    return ['Nouvelle entrée créée'];
  }

  if (oldValues && newValues) {
    for (const key of Object.keys(newValues)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        const fieldName = key.replace(/_/g, ' ');
        changes.push(`${fieldName}: ${oldValues[key] || '(vide)'} → ${newValues[key]}`);
      }
    }
  }

  return changes.length > 0 ? changes : ['Aucun changement détecté'];
}

function AuditLogItem({ log }: { log: AuditLogRow }) {
  const icon = actionIcons[log.action] || <History className="h-4 w-4" />;
  const label = actionLabels[log.action] || log.action;
  const entityLabel = entityLabels[log.entity_type] || log.entity_type;
  const colorClass = actionColors[log.action] || 'bg-muted text-muted-foreground';
  const changes = formatChanges(log.old_values, log.new_values);

  return (
    <div className="flex gap-4 p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorClass.split(' ')[0])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{label}</span>
          <Badge variant="outline" className="text-xs">
            {entityLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
          </span>
        </div>
        {changes.length > 0 && log.action !== 'create' && (
          <ul className="mt-2 space-y-1">
            {changes.slice(0, 3).map((change, i) => (
              <li key={i} className="text-sm text-muted-foreground truncate">
                • {change}
              </li>
            ))}
            {changes.length > 3 && (
              <li className="text-sm text-muted-foreground">
                ... et {changes.length - 3} autre(s) modification(s)
              </li>
            )}
          </ul>
        )}
        {log.user_agent && (
          <p className="mt-1 text-xs text-muted-foreground/60 truncate">
            {log.user_agent.substring(0, 60)}...
          </p>
        )}
      </div>
    </div>
  );
}

export function AuditHistory({ dossierId }: AuditHistoryProps) {
  const { data: logs, isLoading } = useAuditLogs(dossierId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucun historique</p>
        <p className="text-sm">Les modifications seront enregistrées ici</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <History className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Historique des modifications</h3>
        <Badge variant="secondary" className="ml-auto">
          {logs.length} entrée{logs.length > 1 ? 's' : ''}
        </Badge>
      </div>
      <ScrollArea className="h-[400px]">
        {logs.map((log) => (
          <AuditLogItem key={log.id} log={log} />
        ))}
      </ScrollArea>
    </div>
  );
}
