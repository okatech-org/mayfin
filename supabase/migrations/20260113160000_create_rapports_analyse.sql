-- Create rapports_analyse table for Bank Analysis Reports with structured questionnaire
CREATE TABLE public.rapports_analyse (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Section 1 : Projet
  zone_exploitation_adresse TEXT,
  zone_exploitation_code_postal VARCHAR(5),
  zone_exploitation_commune TEXT,
  detail_demande TEXT,
  commentaire_zone_exploitation TEXT,
  
  -- Section 2 : Porteur projet
  premiere_experience_entrepreneuriale BOOLEAN,
  exigences_acces_profession BOOLEAN,
  exigences_acces_commentaire TEXT,
  liens_associes TEXT,
  conjoint_role_activite BOOLEAN,
  conjoint_role_detail TEXT,
  autres_infos_porteur TEXT,
  emprunteur_multi_bancarise BOOLEAN,
  
  -- Section 3 : Cession
  presence_justificatif_cession BOOLEAN,
  salaries_repris VARCHAR(20), -- 'oui', 'non', 'partiellement'
  salaries_repris_commentaire TEXT,
  raisons_cession TEXT,
  commentaire_environnement_local TEXT,
  autres_infos_projet TEXT,
  
  -- Section 4 : Analyse financière
  commentaire_bilans_consolides TEXT,
  synthese_compte_resultat TEXT,
  evenements_conjoncturels BOOLEAN,
  evenements_conjoncturels_detail TEXT,
  
  -- Section 5 : Prévisionnel
  charges_previsionnelles JSONB, -- Array of charge objects
  commentaire_charges_externes TEXT,
  commentaire_marge_brute TEXT,
  validation_caf_previsionnel BOOLEAN,
  commentaire_evolution_fonds_propres TEXT,
  validation_caf_global BOOLEAN,
  caf_couvre_annuites BOOLEAN,
  
  -- Section 6 : Endettement
  beneficie_aides_etat BOOLEAN,
  aides_etat_detail JSONB, -- {type, montant}
  revenus_cautions JSONB, -- Array of {nom, revenus_actuels, revenus_futurs, source}
  endettement_cautions JSONB, -- Array of {nom, charges, taux_actuel, rav_actuel, taux_futur, rav_futur}
  
  -- Section 7 : Commentaires prévisionnel
  commentaire_charges_personnels TEXT,
  commentaire_charges_externes_previsionnel TEXT,
  
  -- Section 8 : Contrôles
  presence_financements_lies BOOLEAN,
  financements_lies_detail TEXT,
  presentation_declic BOOLEAN,
  fonds_propres_negatifs BOOLEAN,
  fonds_propres_negatifs_commentaire TEXT,
  controles_indispensables_realises BOOLEAN,
  
  -- Section 9 : Synthèse
  synthese_collaborateur VARCHAR(20), -- 'concluante', 'non_concluante'
  synthese_motif_non_concluant TEXT,
  point_attention TEXT,
  ajout_point_texte TEXT,
  decision_finale VARCHAR(30), -- 'accord_favorable', 'accord_conditionne', 'refus', 'transmission_comite'
  conditions_particulieres JSONB, -- Array of condition strings
  
  -- Métadonnées
  statut VARCHAR(20) DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'finalise', 'valide')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalized_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.rapports_analyse ENABLE ROW LEVEL SECURITY;

-- RLS Policies (based on dossier ownership)
CREATE POLICY "Users can view rapports of their dossiers" ON public.rapports_analyse
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = rapports_analyse.dossier_id AND dossiers.user_id = auth.uid()
  ));

CREATE POLICY "Users can create rapports for their dossiers" ON public.rapports_analyse
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = rapports_analyse.dossier_id AND dossiers.user_id = auth.uid()
  ));

CREATE POLICY "Users can update rapports of their dossiers" ON public.rapports_analyse
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = rapports_analyse.dossier_id AND dossiers.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete rapports of their dossiers" ON public.rapports_analyse
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = rapports_analyse.dossier_id AND dossiers.user_id = auth.uid()
  ));

-- Admin policies
CREATE POLICY "Admins can view all rapports" ON public.rapports_analyse
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all rapports" ON public.rapports_analyse
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Create trigger for updated_at
CREATE TRIGGER update_rapports_analyse_updated_at
  BEFORE UPDATE ON public.rapports_analyse
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_rapports_analyse_dossier_id ON public.rapports_analyse(dossier_id);
CREATE INDEX idx_rapports_analyse_user_id ON public.rapports_analyse(user_id);
CREATE INDEX idx_rapports_analyse_statut ON public.rapports_analyse(statut);

-- Unique constraint: one report per dossier
CREATE UNIQUE INDEX idx_rapports_analyse_dossier_unique ON public.rapports_analyse(dossier_id);
