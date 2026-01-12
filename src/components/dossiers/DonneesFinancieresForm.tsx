import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Save, Loader2, Calculator, TrendingUp, Wallet, Building } from 'lucide-react';
import { useSaveFinancieres, type DonneesFinancieresRow } from '@/hooks/useDossiers';

const currentYear = new Date().getFullYear();

const schema = z.object({
  chiffre_affaires: z.coerce.number().optional(),
  resultat_net: z.coerce.number().optional(),
  ebitda: z.coerce.number().optional(),
  capacite_autofinancement: z.coerce.number().optional(),
  total_actif: z.coerce.number().optional(),
  actif_circulant: z.coerce.number().optional(),
  stocks: z.coerce.number().optional(),
  creances_clients: z.coerce.number().optional(),
  tresorerie: z.coerce.number().optional(),
  total_passif: z.coerce.number().optional(),
  capitaux_propres: z.coerce.number().optional(),
  dettes_financieres: z.coerce.number().optional(),
  passif_circulant: z.coerce.number().optional(),
  dettes_fournisseurs: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface DonneesFinancieresFormProps {
  dossierId: string;
  existingData: DonneesFinancieresRow[];
}

export function DonneesFinancieresForm({ dossierId, existingData }: DonneesFinancieresFormProps) {
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const saveFinancieres = useSaveFinancieres();

  const years = [currentYear - 1, currentYear - 2, currentYear - 3];

  const existingForYear = existingData.find(d => d.annee_exercice === selectedYear);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: existingForYear ? {
      chiffre_affaires: existingForYear.chiffre_affaires ?? undefined,
      resultat_net: existingForYear.resultat_net ?? undefined,
      ebitda: existingForYear.ebitda ?? undefined,
      capacite_autofinancement: existingForYear.capacite_autofinancement ?? undefined,
      total_actif: existingForYear.total_actif ?? undefined,
      actif_circulant: existingForYear.actif_circulant ?? undefined,
      stocks: existingForYear.stocks ?? undefined,
      creances_clients: existingForYear.creances_clients ?? undefined,
      tresorerie: existingForYear.tresorerie ?? undefined,
      total_passif: existingForYear.total_passif ?? undefined,
      capitaux_propres: existingForYear.capitaux_propres ?? undefined,
      dettes_financieres: existingForYear.dettes_financieres ?? undefined,
      passif_circulant: existingForYear.passif_circulant ?? undefined,
      dettes_fournisseurs: existingForYear.dettes_fournisseurs ?? undefined,
    } : undefined,
  });

  const onSubmit = async (data: FormData) => {
    await saveFinancieres.mutateAsync({
      dossier_id: dossierId,
      annee_exercice: selectedYear,
      chiffre_affaires: data.chiffre_affaires ?? null,
      resultat_net: data.resultat_net ?? null,
      ebitda: data.ebitda ?? null,
      capacite_autofinancement: data.capacite_autofinancement ?? null,
      total_actif: data.total_actif ?? null,
      actif_circulant: data.actif_circulant ?? null,
      stocks: data.stocks ?? null,
      creances_clients: data.creances_clients ?? null,
      tresorerie: data.tresorerie ?? null,
      total_passif: data.total_passif ?? null,
      capitaux_propres: data.capitaux_propres ?? null,
      dettes_financieres: data.dettes_financieres ?? null,
      passif_circulant: data.passif_circulant ?? null,
      dettes_fournisseurs: data.dettes_fournisseurs ?? null,
    });
  };

  // Calculate derived values
  const watchedValues = form.watch();
  const bfr = ((watchedValues.stocks ?? 0) + (watchedValues.creances_clients ?? 0)) - (watchedValues.dettes_fournisseurs ?? 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Données financières
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Year selector */}
        <Tabs value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <TabsList className="mb-6">
            {years.map(year => (
              <TabsTrigger key={year} value={year.toString()} className="gap-2">
                {year}
                {existingData.some(d => d.annee_exercice === year) && (
                  <span className="w-2 h-2 rounded-full bg-success" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {years.map(year => (
            <TabsContent key={year} value={year.toString()}>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Compte de résultat */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                      <TrendingUp className="h-4 w-4" />
                      Compte de résultat
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="chiffre_affaires"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chiffre d'affaires HT (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ebitda"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EBITDA / EBE (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="resultat_net"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Résultat net (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="capacite_autofinancement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CAF (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Bilan Actif */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                      <Building className="h-4 w-4" />
                      Bilan Actif
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="total_actif"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Actif (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="actif_circulant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Actif Circulant (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stocks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stocks (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="creances_clients"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Créances clients (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tresorerie"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trésorerie (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Bilan Passif */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2 text-primary">
                      <Wallet className="h-4 w-4" />
                      Bilan Passif
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="total_passif"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Passif (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="capitaux_propres"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capitaux Propres (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dettes_financieres"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dettes Financières (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="passif_circulant"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passif Circulant (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dettes_fournisseurs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dettes Fournisseurs (€)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Calculated BFR */}
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">BFR calculé (Stocks + Créances clients - Dettes fournisseurs)</p>
                    <p className="text-2xl font-bold">{bfr.toLocaleString('fr-FR')} €</p>
                  </div>

                  <Button type="submit" disabled={saveFinancieres.isPending}>
                    {saveFinancieres.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer {selectedYear}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
