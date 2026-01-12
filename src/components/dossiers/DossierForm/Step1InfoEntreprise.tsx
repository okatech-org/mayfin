import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useInseeValidation } from '@/hooks/useInseeValidation';
import { toast } from 'sonner';

const schema = z.object({
  raisonSociale: z.string().min(1, 'La raison sociale est requise'),
  siren: z.string().regex(/^\d{9}$/, 'Le SIREN doit contenir 9 chiffres'),
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit contenir 14 chiffres').optional().or(z.literal('')),
  formeJuridique: z.string().min(1, 'La forme juridique est requise'),
  dateCreation: z.string().optional(),
  codeNaf: z.string().optional(),
  secteurActivite: z.string().optional(),
  nbSalaries: z.number().min(0).optional(),
  adresseSiege: z.string().optional(),
  enProcedure: z.boolean().default(false),
  typeProcedure: z.string().optional(),
  dateJugement: z.string().optional(),
  tribunal: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Step1Props {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function Step1InfoEntreprise({ data, onUpdate }: Step1Props) {
  const [sirenValidated, setSirenValidated] = useState(false);
  const { validateSiren, isLoading: validatingInsee, error: inseeError } = useInseeValidation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      raisonSociale: data.raisonSociale || '',
      siren: data.siren || '',
      siret: data.siret || '',
      formeJuridique: data.formeJuridique || '',
      dateCreation: data.dateCreation || '',
      codeNaf: data.codeNaf || '',
      secteurActivite: data.secteurActivite || '',
      nbSalaries: data.nbSalaries || undefined,
      adresseSiege: data.adresseSiege || '',
      enProcedure: data.enProcedure || false,
      typeProcedure: data.typeProcedure || '',
      dateJugement: data.dateJugement || '',
      tribunal: data.tribunal || '',
    },
  });

  const enProcedure = form.watch('enProcedure');
  const siren = form.watch('siren');

  // Auto-save on blur
  const handleBlur = () => {
    const values = form.getValues();
    onUpdate(values);
  };

  // Validate SIREN and auto-fill data
  const handleValidateSiren = async () => {
    const sirenValue = form.getValues('siren');
    
    if (!/^\d{9}$/.test(sirenValue)) {
      toast.error('Le SIREN doit contenir 9 chiffres');
      return;
    }

    const inseeData = await validateSiren(sirenValue);
    
    if (inseeData) {
      // Auto-fill form with INSEE data
      form.setValue('raisonSociale', inseeData.raisonSociale);
      form.setValue('siret', inseeData.siret);
      form.setValue('formeJuridique', inseeData.formeJuridique);
      form.setValue('dateCreation', inseeData.dateCreation);
      form.setValue('codeNaf', inseeData.codeNaf);
      form.setValue('adresseSiege', inseeData.adresseSiege);
      form.setValue('nbSalaries', inseeData.effectif);
      
      // Map secteur
      const secteurMap: Record<string, string> = {
        'Construction': 'BTP',
        'Restauration': 'RESTAURATION',
        'Commerce': 'COMMERCE',
        'Services': 'SERVICES',
        'Conseil': 'SERVICES',
        'Télécommunications': 'TECH',
      };
      const secteur = Object.entries(secteurMap).find(([key]) => 
        inseeData.secteurActivite.toLowerCase().includes(key.toLowerCase())
      );
      if (secteur) {
        form.setValue('secteurActivite', secteur[1]);
      }
      
      setSirenValidated(true);
      toast.success('Données INSEE récupérées avec succès');
      
      // Update parent
      handleBlur();
    } else {
      setSirenValidated(false);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Informations de l'entreprise</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Renseignez les informations légales de l'entreprise
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SIREN with validation */}
          <FormField
            control={form.control}
            name="siren"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>SIREN *</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <div className="relative flex-1">
                      <Input 
                        {...field} 
                        onBlur={handleBlur} 
                        placeholder="123456789" 
                        maxLength={9}
                        onChange={(e) => {
                          field.onChange(e);
                          setSirenValidated(false);
                        }}
                        className={sirenValidated ? "pr-10 border-success" : ""}
                      />
                      {sirenValidated && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                      )}
                    </div>
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleValidateSiren}
                    disabled={validatingInsee || siren.length !== 9}
                  >
                    {validatingInsee ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Valider INSEE
                      </>
                    )}
                  </Button>
                </div>
                {inseeError && (
                  <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                    <AlertCircle className="h-4 w-4" />
                    {inseeError}
                  </div>
                )}
                {sirenValidated && (
                  <Badge variant="outline" className="mt-2 text-success border-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    SIREN validé par l'INSEE
                  </Badge>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="raisonSociale"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Raison sociale *</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="Nom de l'entreprise" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="siret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SIRET</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="12345678901234" maxLength={14} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="formeJuridique"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forme juridique *</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); handleBlur(); }} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SARL">SARL</SelectItem>
                    <SelectItem value="SAS">SAS</SelectItem>
                    <SelectItem value="SASU">SASU</SelectItem>
                    <SelectItem value="EURL">EURL</SelectItem>
                    <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                    <SelectItem value="AUTO">Auto-entrepreneur</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="SCI">SCI</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateCreation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de création</FormLabel>
                <FormControl>
                  <Input type="date" {...field} onBlur={handleBlur} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codeNaf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code NAF</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="0000A" maxLength={5} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secteurActivite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secteur d'activité</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); handleBlur(); }} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BTP">BTP / Construction</SelectItem>
                    <SelectItem value="COMMERCE">Commerce</SelectItem>
                    <SelectItem value="SERVICES">Services</SelectItem>
                    <SelectItem value="INDUSTRIE">Industrie</SelectItem>
                    <SelectItem value="TRANSPORT">Transport / Logistique</SelectItem>
                    <SelectItem value="RESTAURATION">Restauration / Hôtellerie</SelectItem>
                    <SelectItem value="SANTE">Santé</SelectItem>
                    <SelectItem value="TECH">Technologie / Digital</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nbSalaries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de salariés</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    onBlur={handleBlur} 
                    placeholder="0" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="adresseSiege"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Adresse du siège social</FormLabel>
                <FormControl>
                  <Textarea {...field} onBlur={handleBlur} placeholder="Adresse complète" rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Procédure collective */}
        <div className="border-t border-border pt-6">
          <FormField
            control={form.control}
            name="enProcedure"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      handleBlur();
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Entreprise en procédure collective</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Cochez si l'entreprise fait l'objet d'une procédure (conciliation, sauvegarde, redressement...)
                  </p>
                </div>
              </FormItem>
            )}
          />

          {enProcedure && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 p-4 bg-muted/50 rounded-lg">
              <FormField
                control={form.control}
                name="typeProcedure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de procédure</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); handleBlur(); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conciliation">Conciliation</SelectItem>
                        <SelectItem value="sauvegarde">Sauvegarde</SelectItem>
                        <SelectItem value="redressement">Redressement judiciaire</SelectItem>
                        <SelectItem value="liquidation">Liquidation judiciaire</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateJugement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date du jugement</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} onBlur={handleBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tribunal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tribunal compétent</FormLabel>
                    <FormControl>
                      <Input {...field} onBlur={handleBlur} placeholder="Tribunal de commerce de..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </Form>
  );
}
