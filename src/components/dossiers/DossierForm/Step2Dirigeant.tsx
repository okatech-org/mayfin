import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AlertTriangle } from 'lucide-react';

const schema = z.object({
  dirigeantCivilite: z.string().optional(),
  dirigeantNom: z.string().min(1, 'Le nom est requis'),
  dirigeantPrenom: z.string().min(1, 'Le prénom est requis'),
  dirigeantDateNaissance: z.string().optional(),
  dirigeantAdresse: z.string().optional(),
  dirigeantTelephone: z.string().optional(),
  dirigeantEmail: z.string().email('Email invalide').optional().or(z.literal('')),
  dirigeantExperience: z.number().min(0).optional(),
  dirigeantFicheFicp: z.boolean().default(false),
});

type FormData = z.infer<typeof schema>;

interface Step2Props {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function Step2Dirigeant({ data, onUpdate }: Step2Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      dirigeantCivilite: data.dirigeantCivilite || '',
      dirigeantNom: data.dirigeantNom || '',
      dirigeantPrenom: data.dirigeantPrenom || '',
      dirigeantDateNaissance: data.dirigeantDateNaissance || '',
      dirigeantAdresse: data.dirigeantAdresse || '',
      dirigeantTelephone: data.dirigeantTelephone || '',
      dirigeantEmail: data.dirigeantEmail || '',
      dirigeantExperience: data.dirigeantExperience || undefined,
      dirigeantFicheFicp: data.dirigeantFicheFicp || false,
    },
  });

  const ficheFicp = form.watch('dirigeantFicheFicp');

  const handleBlur = () => {
    const values = form.getValues();
    onUpdate(values);
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Informations du dirigeant</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Renseignez les informations personnelles du dirigeant principal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="dirigeantCivilite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Civilité</FormLabel>
                <Select onValueChange={(value) => { field.onChange(value); handleBlur(); }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="M.">Monsieur</SelectItem>
                    <SelectItem value="Mme">Madame</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div /> {/* Spacer */}

          <FormField
            control={form.control}
            name="dirigeantNom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom *</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="Nom de famille" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantPrenom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom *</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="Prénom" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantDateNaissance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de naissance</FormLabel>
                <FormControl>
                  <Input type="date" {...field} onBlur={handleBlur} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expérience dans le secteur (années)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    onBlur={handleBlur} 
                    placeholder="5" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantTelephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Téléphone</FormLabel>
                <FormControl>
                  <Input {...field} onBlur={handleBlur} placeholder="06 XX XX XX XX" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} onBlur={handleBlur} placeholder="email@exemple.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dirigeantAdresse"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Adresse personnelle</FormLabel>
                <FormControl>
                  <Textarea {...field} onBlur={handleBlur} placeholder="Adresse complète" rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* FICP Warning */}
        <div className="border-t border-border pt-6">
          <FormField
            control={form.control}
            name="dirigeantFicheFicp"
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
                  <FormLabel>Dirigeant fiché au FICP</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Fichier national des Incidents de remboursement des Crédits aux Particuliers
                  </p>
                </div>
              </FormItem>
            )}
          />

          {ficheFicp && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Point d'attention majeur</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le fichage FICP du dirigeant constitue un critère défavorable important dans l'analyse du dossier. 
                  Des justificatifs complémentaires seront demandés.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Form>
  );
}
