import { useState } from 'react';
import { AdminSystemLayout } from '@/components/admin-system/AdminSystemLayout';
import {
  FileText,
  Search,
  Loader2,
  Filter,
  Shield,
  Users,
  Eye,
  AlertTriangle,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAuditLogs, useAdminActionTypes } from '@/hooks/useAdminAuditLogs';
import { maskEmail, getActionLabel, formatAuditDetails } from '@/lib/emailMasking';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showEmails, setShowEmails] = useState<Set<string>>(new Set());

  const { data: logs, isLoading, refetch, isRefetching } = useAdminAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    limit: 200,
  });

  const { data: actionTypes } = useAdminActionTypes();

  const filteredLogs = logs?.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.admin_email?.toLowerCase().includes(searchLower) ||
      log.admin_name?.toLowerCase().includes(searchLower) ||
      log.entity_id?.toLowerCase().includes(searchLower)
    );
  });

  const toggleEmailVisibility = (logId: string) => {
    setShowEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('ROLE')) {
      return <Shield className="h-4 w-4 text-amber-500" />;
    }
    if (action.includes('LIST') || action.includes('VIEW')) {
      return <Eye className="h-4 w-4 text-blue-500" />;
    }
    if (action.includes('FAILED')) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <Users className="h-4 w-4 text-slate-400" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('FAILED')) {
      return <Badge variant="destructive" className="text-xs">Échec</Badge>;
    }
    if (action.includes('ROLE_CHANGED')) {
      return <Badge className="bg-amber-600 hover:bg-amber-700 text-xs">Modification</Badge>;
    }
    if (action.includes('LIST') || action.includes('VIEW')) {
      return <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs">Consultation</Badge>;
    }
    return <Badge variant="outline" className="text-xs">{action}</Badge>;
  };

  return (
    <AdminSystemLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Logs d'audit administrateur</h1>
            <p className="text-slate-400 mt-1">
              Traçabilité des actions administratives pour la conformité et la sécurité
            </p>
          </div>
          <Button 
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600/20">
                  <Eye className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Consultations</p>
                  <p className="text-xl font-bold text-white">
                    {logs?.filter(l => l.action.includes('LIST') || l.action.includes('VIEW')).length ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600/20">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Modifications rôles</p>
                  <p className="text-xl font-bold text-white">
                    {logs?.filter(l => l.action === 'ADMIN_ROLE_CHANGED').length ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-600/20">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Échecs</p>
                  <p className="text-xl font-bold text-white">
                    {logs?.filter(l => l.action.includes('FAILED')).length ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-600/20">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total logs</p>
                  <p className="text-xl font-bold text-white">{logs?.length ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Journal d'audit ({filteredLogs?.length ?? 0})
            </CardTitle>
            <CardDescription className="text-slate-400">
              Historique des actions administratives avec traçabilité complète
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Rechercher par email, nom, action..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[240px] bg-slate-800 border-slate-700 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par action" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white focus:bg-slate-700">
                    Toutes les actions
                  </SelectItem>
                  {actionTypes?.map(action => (
                    <SelectItem key={action} value={action} className="text-white focus:bg-slate-700">
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-1">
                  Aucun log trouvé
                </h3>
                <p className="text-sm text-slate-400">
                  Les actions administratives seront enregistrées ici
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">Administrateur</TableHead>
                      <TableHead className="text-slate-400">Action</TableHead>
                      <TableHead className="text-slate-400">Détails</TableHead>
                      <TableHead className="text-slate-400">Cible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs?.map((log) => (
                      <TableRow key={log.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-white text-sm">
                              {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {format(new Date(log.created_at), 'HH:mm:ss', { locale: fr })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-white text-sm">
                              {log.admin_name || 'Administrateur'}
                            </span>
                            <button
                              onClick={() => toggleEmailVisibility(log.id)}
                              className="text-slate-400 text-xs hover:text-blue-400 text-left flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              {maskEmail(log.admin_email || '', showEmails.has(log.id))}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <div className="flex flex-col gap-1">
                              {getActionBadge(log.action)}
                              <span className="text-slate-400 text-xs">
                                {getActionLabel(log.action)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-300 text-sm">
                            {formatAuditDetails(log.old_values, log.new_values)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.entity_id ? (
                            <code className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                              {log.entity_id.slice(0, 8)}...
                            </code>
                          ) : (
                            <span className="text-slate-500 text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Note de confidentialité</p>
                <p className="text-xs text-slate-400 mt-1">
                  Les emails sont masqués par défaut. Cliquez sur un email pour le révéler temporairement. 
                  Toutes les consultations de logs sont elles-mêmes journalisées pour la conformité RGPD.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminSystemLayout>
  );
}
