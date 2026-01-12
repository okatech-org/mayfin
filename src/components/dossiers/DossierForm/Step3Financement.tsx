import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  FormDescription,
} from '@/components/ui/form';
import { Wallet, CreditCard, Truck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  typeFinancement: z.string().min(1, 'Le type de financement est requis'),
  montantDemande: z.number().min(1000, 'Le montant minimum est de 1 000€'),
  dureeMois: z.number().min(6).max(120).optional(),
  objetFinancement: z.string().optional(),
  natureBien: z.string().optional(),
  descriptionBien: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const financementTypes = [
  {
    id: 'investissement',
    name: 'Crédit d\'investissement',
    description: 'Financement de matériel, véhicule, immobilier...',
    icon: Wallet,
  },
  {
    id: 'tresorerie',
    name: 'Crédit de trésorerie',
    description: 'Besoin en fonds de roulement, facilité de caisse...',
    icon: CreditCard,
  },
  {
    id: 'credit_bail',
    name: 'Crédit-bail',
    description: 'Location avec option d\'achat (LOA)',
    icon: Truck,
  },
  {
    id: 'affacturage',
    name: 'Affacturage',
    description: 'Cession de créances clients',
    icon: BarChart3,
  },
];

interface Step3Props {
  data: Record<string, any>;
  onUpdate: (data: Record<string, any>) => void;
}

export function Step3Financement({ data, onUpdate }: Step3Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      typeFinancement: data.typeFinancement || '',
      montantDemande: data.montantDemande || undefined,
      dureeMois: data.dureeMois || undefined,
      objetFinancement: data.objetFinancement || '',
      natureBien: data.natureBien || '',
      descriptionBien: data.descriptionBien || '',
    },
  });

  const typeFinancement = form.watch('typeFinancement');
  const showBienFields = typeFinancement === 'investissement' || typeFinancement === 'credit_bail';

  const handleBlur = () => {
    const values = form.getValues();
    onUpdate(values);
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Demande de financement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Décrivez le besoin de financement de l'entreprise
          </p>
        </div>

        {/* Type de financement - Cards */}
        <FormField
          control={form.control}
          name="typeFinancement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de financement *</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {financementTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      field.onChange(type.id);
                      handleBlur();
                    }}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all',
                      field.value === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                      field.value === type.id ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      <type.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={cn(
                        'font-medium',
                        field.value === type.id ? 'text-primary' : 'text-foreground'
                      )}>
                        {type.name}
                      </p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="montantDemande"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant demandé (€) *</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    onBlur={handleBlur} 
                    placeholder="50000" 
                  />
                </FormControl>
                <FormDescription>Minimum 1 000€</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dureeMois"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durée souhaitée (mois)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    onBlur={handleBlur} 
                    placeholder="60" 
                  />
                </FormControl>
                <FormDescription>De 6 à 120 mois selon le produit</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="objetFinancement"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Objet du financement</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    onBlur={handleBlur} 
                    placeholder="Décrivez le projet ou le besoin de financement..." 
                    rows={3} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bien à financer (conditonnel) */}
        {showBienFields && (
          <div className="border-t border-border pt-6">
            <h3 className="font-medium text-foreground mb-4">Bien à financer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="natureBien"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nature du bien</FormLabel>
                    <Select onValueChange={(value) => { field.onChange(value); handleBlur(); }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="materiel">Matériel / Équipement</SelectItem>
                        <SelectItem value="vehicule">Véhicule</SelectItem>
                        <SelectItem value="immobilier">Immobilier</SelectItem>
                        <SelectItem value="fonds_commerce">Fonds de commerce</SelectItem>
                        <SelectItem value="informatique">Informatique / IT</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div /> {/* Spacer */}

              <FormField
                control={form.control}
                name="descriptionBien"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description détaillée du bien</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        onBlur={handleBlur} 
                        placeholder="Marque, modèle, caractéristiques, fournisseur..." 
                        rows={3} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </Form>
  );
}
