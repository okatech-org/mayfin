import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Dossier, DossierStatus, TypeFinancement } from '@/types/dossier.types';

const statusConfig: Record<DossierStatus, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  en_analyse: { label: 'En analyse', className: 'bg-info/10 text-info border-info/20' },
  valide: { label: 'Validé', className: 'bg-success/10 text-success border-success/20' },
  refuse: { label: 'Refusé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  attente_documents: { label: 'Attente docs', className: 'bg-warning/10 text-warning border-warning/20' },
};

const typeFinancementLabels: Record<TypeFinancement, string> = {
  investissement: 'Investissement',
  tresorerie: 'Trésorerie',
  credit_bail: 'Crédit-bail',
  affacturage: 'Affacturage',
};

interface DossiersListProps {
  dossiers: Dossier[];
}

export function DossiersList({ dossiers }: DossiersListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredDossiers = dossiers.filter((dossier) => {
    const matchesSearch = 
      dossier.raisonSociale.toLowerCase().includes(search.toLowerCase()) ||
      dossier.siren.includes(search);
    const matchesStatus = statusFilter === 'all' || dossier.status === statusFilter;
    const matchesType = typeFilter === 'all' || dossier.typeFinancement === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou SIREN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_analyse">En analyse</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="refuse">Refusé</SelectItem>
            <SelectItem value="attente_documents">Attente docs</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type financement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="investissement">Investissement</SelectItem>
            <SelectItem value="tresorerie">Trésorerie</SelectItem>
            <SelectItem value="credit_bail">Crédit-bail</SelectItem>
            <SelectItem value="affacturage">Affacturage</SelectItem>
          </SelectContent>
        </Select>

        <Button asChild className="ml-auto">
          <Link to="/dossiers/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredDossiers.length} dossier{filteredDossiers.length > 1 ? 's' : ''} trouvé{filteredDossiers.length > 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Entreprise</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">SIREN</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Type</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Montant</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Score</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Statut</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Date</th>
                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDossiers.map((dossier) => {
                const status = statusConfig[dossier.status];
                return (
                  <tr key={dossier.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{dossier.raisonSociale}</p>
                          <p className="text-sm text-muted-foreground">{dossier.dirigeantNom} {dossier.dirigeantPrenom}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-muted-foreground">{dossier.siren}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {typeFinancementLabels[dossier.typeFinancement]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dossier.montantDemande)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dossier.scoreGlobal !== undefined ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className={cn(
                              'h-2 w-12 rounded-full bg-muted overflow-hidden'
                            )}
                          >
                            <div 
                              className={cn(
                                'h-full rounded-full',
                                dossier.scoreGlobal >= 80 ? 'bg-success' :
                                dossier.scoreGlobal >= 60 ? 'bg-warning' : 'bg-destructive'
                              )}
                              style={{ width: `${dossier.scoreGlobal}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{dossier.scoreGlobal}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-xs', status.className)}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(dossier.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/dossiers/${dossier.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir détail
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/dossiers/${dossier.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredDossiers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Aucun dossier trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || typeFilter !== 'all' 
                ? "Modifiez vos filtres pour voir plus de résultats"
                : "Commencez par créer votre premier dossier"
              }
            </p>
            {!search && statusFilter === 'all' && typeFilter === 'all' && (
              <Button asChild>
                <Link to="/dossiers/nouveau">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau dossier
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
