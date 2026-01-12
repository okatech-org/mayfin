import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { DossierRow } from '@/hooks/useDossiers';

type SortField = 'raison_sociale' | 'siren' | 'type_financement' | 'montant_demande' | 'score_global' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const statusConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  en_analyse: { label: 'En analyse', className: 'bg-info/10 text-info border-info/20' },
  valide: { label: 'Validé', className: 'bg-success/10 text-success border-success/20' },
  refuse: { label: 'Refusé', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  attente_documents: { label: 'Attente docs', className: 'bg-warning/10 text-warning border-warning/20' },
};

const typeFinancementLabels: Record<string, string> = {
  investissement: 'Investissement',
  tresorerie: 'Trésorerie',
  credit_bail: 'Crédit-bail',
  affacturage: 'Affacturage',
};

interface DossiersListProps {
  dossiers: DossierRow[];
}

export function DossiersList({ dossiers }: DossiersListProps) {
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [montantRange, setMontantRange] = useState<[number, number]>([0, 1000000]);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [enProcedure, setEnProcedure] = useState<boolean | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const maxMontant = useMemo(() => Math.max(...dossiers.map(d => d.montant_demande), 1000000), [dossiers]);

  const filteredAndSortedDossiers = useMemo(() => {
    let result = dossiers.filter((dossier) => {
      // Search filter
      const matchesSearch = 
        dossier.raison_sociale.toLowerCase().includes(search.toLowerCase()) ||
        dossier.siren.includes(search) ||
        (dossier.dirigeant_nom + ' ' + dossier.dirigeant_prenom).toLowerCase().includes(search.toLowerCase());
      
      // Status filter (multi-select)
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(dossier.status);
      
      // Type filter (multi-select)
      const matchesType = typeFilters.length === 0 || typeFilters.includes(dossier.type_financement);
      
      // Montant range
      const matchesMontant = dossier.montant_demande >= montantRange[0] && dossier.montant_demande <= montantRange[1];
      
      // Score range
      const score = dossier.score_global ?? 0;
      const matchesScore = score >= scoreRange[0] && score <= scoreRange[1];
      
      // En procédure filter
      const matchesProcedure = enProcedure === null || dossier.en_procedure === enProcedure;
      
      return matchesSearch && matchesStatus && matchesType && matchesMontant && matchesScore && matchesProcedure;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'raison_sociale':
          comparison = a.raison_sociale.localeCompare(b.raison_sociale);
          break;
        case 'siren':
          comparison = a.siren.localeCompare(b.siren);
          break;
        case 'type_financement':
          comparison = a.type_financement.localeCompare(b.type_financement);
          break;
        case 'montant_demande':
          comparison = a.montant_demande - b.montant_demande;
          break;
        case 'score_global':
          comparison = (a.score_global ?? 0) - (b.score_global ?? 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [dossiers, search, statusFilters, typeFilters, montantRange, scoreRange, enProcedure, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const activeFiltersCount = statusFilters.length + typeFilters.length + 
    (montantRange[0] > 0 || montantRange[1] < maxMontant ? 1 : 0) +
    (scoreRange[0] > 0 || scoreRange[1] < 100 ? 1 : 0) +
    (enProcedure !== null ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilters([]);
    setTypeFilters([]);
    setMontantRange([0, maxMontant]);
    setScoreRange([0, 100]);
    setEnProcedure(null);
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, SIREN ou dirigeant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Status multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[140px]">
              Statut {statusFilters.length > 0 && `(${statusFilters.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-2">
              {Object.entries(statusConfig).map(([value, { label }]) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    checked={statusFilters.includes(value)}
                    onCheckedChange={(checked) => {
                      setStatusFilters(checked 
                        ? [...statusFilters, value]
                        : statusFilters.filter(s => s !== value)
                      );
                    }}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Type multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[160px]">
              Type {typeFilters.length > 0 && `(${typeFilters.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <div className="space-y-2">
              {Object.entries(typeFinancementLabels).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    checked={typeFilters.includes(value)}
                    onCheckedChange={(checked) => {
                      setTypeFilters(checked 
                        ? [...typeFilters, value]
                        : typeFilters.filter(t => t !== value)
                      );
                    }}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Advanced filters toggle */}
        <Button 
          variant={showAdvancedFilters ? "secondary" : "outline"} 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtres avancés
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">{activeFiltersCount}</Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}

        <Button asChild className="ml-auto">
          <Link to="/dossiers/nouveau">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      {/* Advanced filters panel */}
      {showAdvancedFilters && (
        <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Montant demandé</label>
            <div className="px-2">
              <Slider
                value={montantRange}
                min={0}
                max={maxMontant}
                step={10000}
                onValueChange={(value) => setMontantRange(value as [number, number])}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{montantRange[0].toLocaleString('fr-FR')} €</span>
                <span>{montantRange[1].toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Score</label>
            <div className="px-2">
              <Slider
                value={scoreRange}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => setScoreRange(value as [number, number])}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{scoreRange[0]}</span>
                <span>{scoreRange[1]}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">En procédure collective</label>
            <Select value={enProcedure === null ? 'all' : enProcedure.toString()} onValueChange={(v) => setEnProcedure(v === 'all' ? null : v === 'true')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Oui</SelectItem>
                <SelectItem value="false">Non</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredAndSortedDossiers.length} dossier{filteredAndSortedDossiers.length > 1 ? 's' : ''} trouvé{filteredAndSortedDossiers.length > 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('raison_sociale')}>
                    Entreprise <SortIcon field="raison_sociale" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('siren')}>
                    SIREN <SortIcon field="siren" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('type_financement')}>
                    Type <SortIcon field="type_financement" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('montant_demande')}>
                    Montant <SortIcon field="montant_demande" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('score_global')}>
                    Score <SortIcon field="score_global" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('status')}>
                    Statut <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  <button className="flex items-center hover:text-foreground" onClick={() => handleSort('created_at')}>
                    Date <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedDossiers.map((dossier) => {
                const status = statusConfig[dossier.status] || statusConfig.brouillon;
                return (
                  <tr key={dossier.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{dossier.raison_sociale}</p>
                          <p className="text-sm text-muted-foreground">{dossier.dirigeant_nom} {dossier.dirigeant_prenom}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-sm text-muted-foreground">{dossier.siren}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {typeFinancementLabels[dossier.type_financement] || dossier.type_financement}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(dossier.montant_demande)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {dossier.score_global !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-12 rounded-full bg-muted overflow-hidden">
                            <div 
                              className={cn(
                                'h-full rounded-full',
                                dossier.score_global >= 80 ? 'bg-success' :
                                dossier.score_global >= 60 ? 'bg-warning' : 'bg-destructive'
                              )}
                              style={{ width: `${dossier.score_global}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">{dossier.score_global}</span>
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
                        {new Date(dossier.created_at).toLocaleDateString('fr-FR')}
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

        {filteredAndSortedDossiers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Aucun dossier trouvé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Modifiez vos filtres pour voir plus de résultats
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              Effacer les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
