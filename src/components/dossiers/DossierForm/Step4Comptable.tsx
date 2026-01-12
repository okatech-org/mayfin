import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react';

interface Step4Props {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

interface ExerciceData {
  chiffreAffaires?: number;
  resultatNet?: number;
  ebe?: number;
  amortissements?: number;
  chargesFinancieres?: number;
  totalActif?: number;
  actifCirculant?: number;
  stocks?: number;
  creancesClients?: number;
  tresorerie?: number;
  capitauxPropres?: number;
  dettesFinancieres?: number;
  passifCirculant?: number;
  dettesFournisseurs?: number;
}

const currentYear = new Date().getFullYear();
const years = [currentYear - 1, currentYear - 2, currentYear - 3];

export function Step4Comptable({ data, onUpdate }: Step4Props) {
  const [exercices, setExercices] = useState<Record<number, ExerciceData>>(
    data.exercices || {
      [years[0]]: {},
      [years[1]]: {},
      [years[2]]: {},
    }
  );

  const updateExercice = (year: number, field: string, value: number | undefined) => {
    const newExercices = {
      ...exercices,
      [year]: {
        ...exercices[year],
        [field]: value,
      },
    };
    setExercices(newExercices);
    onUpdate({ exercices: newExercices });
  };

  const calculateCAF = (ex: ExerciceData): number | undefined => {
    if (ex.resultatNet !== undefined && ex.amortissements !== undefined) {
      return ex.resultatNet + ex.amortissements;
    }
    return undefined;
  };

  const calculateEBITDA = (ex: ExerciceData): number | undefined => {
    if (ex.ebe !== undefined) {
      return ex.ebe;
    }
    return undefined;
  };

  const calculateBFR = (ex: ExerciceData): number | undefined => {
    if (ex.stocks !== undefined && ex.creancesClients !== undefined && ex.dettesFournisseurs !== undefined) {
      return ex.stocks + ex.creancesClients - ex.dettesFournisseurs;
    }
    return undefined;
  };

  const formatNumber = (value: number | undefined): string => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Données comptables</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saisissez les données financières des 3 derniers exercices
        </p>
      </div>

      <Tabs defaultValue={years[0].toString()} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {years.map((year) => (
            <TabsTrigger key={year} value={year.toString()}>
              Exercice {year}
            </TabsTrigger>
          ))}
        </TabsList>

        {years.map((year) => (
          <TabsContent key={year} value={year.toString()} className="space-y-6 mt-6">
            {/* Compte de résultat */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Compte de résultat
                </CardTitle>
                <CardDescription>Données de l'exercice {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`ca-${year}`}>Chiffre d'affaires HT</Label>
                    <Input
                      id={`ca-${year}`}
                      type="number"
                      value={exercices[year]?.chiffreAffaires || ''}
                      onChange={(e) => updateExercice(year, 'chiffreAffaires', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="500000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`ebe-${year}`}>EBE (Excédent Brut d'Exploitation)</Label>
                    <Input
                      id={`ebe-${year}`}
                      type="number"
                      value={exercices[year]?.ebe || ''}
                      onChange={(e) => updateExercice(year, 'ebe', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="50000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`rn-${year}`}>Résultat net</Label>
                    <Input
                      id={`rn-${year}`}
                      type="number"
                      value={exercices[year]?.resultatNet || ''}
                      onChange={(e) => updateExercice(year, 'resultatNet', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="30000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`amort-${year}`}>Dotations amortissements</Label>
                    <Input
                      id={`amort-${year}`}
                      type="number"
                      value={exercices[year]?.amortissements || ''}
                      onChange={(e) => updateExercice(year, 'amortissements', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="15000"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`cf-${year}`}>Charges financières</Label>
                    <Input
                      id={`cf-${year}`}
                      type="number"
                      value={exercices[year]?.chargesFinancieres || ''}
                      onChange={(e) => updateExercice(year, 'chargesFinancieres', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="5000"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bilan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-info" />
                  Bilan
                </CardTitle>
                <CardDescription>Actif et passif au {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Actif */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Actif</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor={`ta-${year}`}>Total actif</Label>
                        <Input
                          id={`ta-${year}`}
                          type="number"
                          value={exercices[year]?.totalActif || ''}
                          onChange={(e) => updateExercice(year, 'totalActif', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="300000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`ac-${year}`}>Actif circulant</Label>
                        <Input
                          id={`ac-${year}`}
                          type="number"
                          value={exercices[year]?.actifCirculant || ''}
                          onChange={(e) => updateExercice(year, 'actifCirculant', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="120000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`st-${year}`}>Stocks</Label>
                        <Input
                          id={`st-${year}`}
                          type="number"
                          value={exercices[year]?.stocks || ''}
                          onChange={(e) => updateExercice(year, 'stocks', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="40000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cc-${year}`}>Créances clients</Label>
                        <Input
                          id={`cc-${year}`}
                          type="number"
                          value={exercices[year]?.creancesClients || ''}
                          onChange={(e) => updateExercice(year, 'creancesClients', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="60000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tr-${year}`}>Trésorerie</Label>
                        <Input
                          id={`tr-${year}`}
                          type="number"
                          value={exercices[year]?.tresorerie || ''}
                          onChange={(e) => updateExercice(year, 'tresorerie', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="20000"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passif */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Passif</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor={`cp-${year}`}>Capitaux propres</Label>
                        <Input
                          id={`cp-${year}`}
                          type="number"
                          value={exercices[year]?.capitauxPropres || ''}
                          onChange={(e) => updateExercice(year, 'capitauxPropres', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="100000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`df-${year}`}>Dettes financières</Label>
                        <Input
                          id={`df-${year}`}
                          type="number"
                          value={exercices[year]?.dettesFinancieres || ''}
                          onChange={(e) => updateExercice(year, 'dettesFinancieres', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="80000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`pc-${year}`}>Passif circulant</Label>
                        <Input
                          id={`pc-${year}`}
                          type="number"
                          value={exercices[year]?.passifCirculant || ''}
                          onChange={(e) => updateExercice(year, 'passifCirculant', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="100000"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`dfr-${year}`}>Dettes fournisseurs</Label>
                        <Input
                          id={`dfr-${year}`}
                          type="number"
                          value={exercices[year]?.dettesFournisseurs || ''}
                          onChange={(e) => updateExercice(year, 'dettesFournisseurs', e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="50000"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculs automatiques */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  Indicateurs calculés
                </CardTitle>
                <CardDescription>Calculs automatiques basés sur vos saisies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">CAF</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatNumber(calculateCAF(exercices[year] || {}))}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">EBITDA</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatNumber(calculateEBITDA(exercices[year] || {}))}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-lg">
                    <p className="text-sm text-muted-foreground">BFR</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatNumber(calculateBFR(exercices[year] || {}))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
