import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface DossierRow {
  id: string;
  user_id: string;
  status: string;
  raison_sociale: string;
  siren: string;
  siret: string | null;
  forme_juridique: string | null;
  date_creation: string | null;
  code_naf: string | null;
  secteur_activite: string | null;
  nb_salaries: number | null;
  adresse_siege: string | null;
  en_procedure: boolean;
  type_procedure: string | null;
  date_jugement: string | null;
  tribunal: string | null;
  dirigeant_civilite: string | null;
  dirigeant_nom: string;
  dirigeant_prenom: string;
  dirigeant_date_naissance: string | null;
  dirigeant_adresse: string | null;
  dirigeant_telephone: string | null;
  dirigeant_email: string | null;
  dirigeant_experience: number | null;
  dirigeant_fiche_ficp: boolean | null;
  type_financement: string;
  montant_demande: number;
  duree_mois: number | null;
  objet_financement: string | null;
  nature_bien: string | null;
  description_bien: string | null;
  score_global: number | null;
  recommandation: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DonneesFinancieresRow {
  id: string;
  dossier_id: string;
  annee_exercice: number;
  chiffre_affaires: number | null;
  resultat_net: number | null;
  ebitda: number | null;
  capacite_autofinancement: number | null;
  total_actif: number | null;
  actif_circulant: number | null;
  stocks: number | null;
  creances_clients: number | null;
  tresorerie: number | null;
  total_passif: number | null;
  capitaux_propres: number | null;
  dettes_financieres: number | null;
  passif_circulant: number | null;
  dettes_fournisseurs: number | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  dossier_id: string;
  type_document: string;
  nom_fichier: string;
  chemin_fichier: string;
  taille_octets: number;
  mime_type: string;
  annee_exercice: number | null;
  uploaded_at: string;
}

export function useDossiers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dossiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DossierRow[];
    },
    enabled: !!user,
  });
}

export function useDossier(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dossier', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DossierRow;
    },
    enabled: !!user && !!id,
  });
}

export function useDossierDocuments(dossierId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents', dossierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as DocumentRow[];
    },
    enabled: !!user && !!dossierId,
  });
}

export function useDossierFinancieres(dossierId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['donnees_financieres', dossierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donnees_financieres')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('annee_exercice', { ascending: false });

      if (error) throw error;
      return data as DonneesFinancieresRow[];
    },
    enabled: !!user && !!dossierId,
  });
}

export function useCreateDossier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (dossier: Omit<DossierRow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      const { data, error } = await supabase
        .from('dossiers')
        .insert({
          ...dossier,
          user_id: user!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du dossier');
      console.error(error);
    },
  });
}

export function useUpdateDossier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...dossier }: Partial<DossierRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('dossiers')
        .update(dossier)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['dossier', data.id] });
      toast.success('Dossier mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du dossier');
      console.error(error);
    },
  });
}

export function useUpdateDossierStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, score_global, recommandation }: { 
      id: string; 
      status: string; 
      score_global?: number;
      recommandation?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      if (score_global !== undefined) updateData.score_global = score_global;
      if (recommandation !== undefined) updateData.recommandation = recommandation;

      const { data, error } = await supabase
        .from('dossiers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['dossier', data.id] });
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error(error);
    },
  });
}

export function useSaveFinancieres() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DonneesFinancieresRow, 'id' | 'created_at'>) => {
      const { data: result, error } = await supabase
        .from('donnees_financieres')
        .upsert(data, { onConflict: 'dossier_id,annee_exercice' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['donnees_financieres', data.dossier_id] });
      toast.success('Données financières enregistrées');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(error);
    },
  });
}
