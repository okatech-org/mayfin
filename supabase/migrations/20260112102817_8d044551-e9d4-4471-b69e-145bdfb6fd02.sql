-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'charge_affaires',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dossiers table
CREATE TABLE public.dossiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'en_analyse', 'valide', 'refuse', 'attente_documents')),
  raison_sociale VARCHAR(255) NOT NULL,
  siren CHAR(9) NOT NULL,
  siret CHAR(14),
  forme_juridique VARCHAR(20),
  date_creation DATE,
  code_naf CHAR(5),
  secteur_activite VARCHAR(100),
  nb_salaries INTEGER,
  adresse_siege TEXT,
  en_procedure BOOLEAN NOT NULL DEFAULT false,
  type_procedure VARCHAR(30),
  date_jugement DATE,
  tribunal VARCHAR(255),
  dirigeant_civilite VARCHAR(10),
  dirigeant_nom VARCHAR(100) NOT NULL,
  dirigeant_prenom VARCHAR(100) NOT NULL,
  dirigeant_date_naissance DATE,
  dirigeant_adresse TEXT,
  dirigeant_telephone VARCHAR(20),
  dirigeant_email VARCHAR(255),
  dirigeant_experience INTEGER,
  dirigeant_fiche_ficp BOOLEAN DEFAULT false,
  type_financement VARCHAR(30) NOT NULL CHECK (type_financement IN ('investissement', 'tresorerie', 'credit_bail', 'affacturage')),
  montant_demande DECIMAL(12,2) NOT NULL,
  duree_mois INTEGER,
  objet_financement TEXT,
  nature_bien VARCHAR(50),
  description_bien TEXT,
  score_global INTEGER,
  recommandation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  type_document VARCHAR(50) NOT NULL,
  nom_fichier VARCHAR(255) NOT NULL,
  chemin_fichier VARCHAR(500) NOT NULL,
  taille_octets BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  annee_exercice INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create donnees_financieres table
CREATE TABLE public.donnees_financieres (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  annee_exercice INTEGER NOT NULL,
  chiffre_affaires DECIMAL(12,2),
  resultat_net DECIMAL(12,2),
  ebitda DECIMAL(12,2),
  capacite_autofinancement DECIMAL(12,2),
  total_actif DECIMAL(12,2),
  actif_circulant DECIMAL(12,2),
  stocks DECIMAL(12,2),
  creances_clients DECIMAL(12,2),
  tresorerie DECIMAL(12,2),
  total_passif DECIMAL(12,2),
  capitaux_propres DECIMAL(12,2),
  dettes_financieres DECIMAL(12,2),
  passif_circulant DECIMAL(12,2),
  dettes_fournisseurs DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dossier_id, annee_exercice)
);

-- Create scoring_history table
CREATE TABLE public.scoring_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  score_global INTEGER NOT NULL,
  statut VARCHAR(30) NOT NULL,
  details_json JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  calculated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donnees_financieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for dossiers
CREATE POLICY "Users can view their own dossiers" ON public.dossiers
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
CREATE POLICY "Users can create their own dossiers" ON public.dossiers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own dossiers" ON public.dossiers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dossiers" ON public.dossiers
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for documents (based on dossier ownership)
CREATE POLICY "Users can view documents of their dossiers" ON public.documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = documents.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert documents to their dossiers" ON public.documents
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = documents.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete documents of their dossiers" ON public.documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = documents.dossier_id AND dossiers.user_id = auth.uid()
  ));

-- RLS Policies for donnees_financieres (based on dossier ownership)
CREATE POLICY "Users can view financials of their dossiers" ON public.donnees_financieres
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = donnees_financieres.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert financials to their dossiers" ON public.donnees_financieres
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = donnees_financieres.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can update financials of their dossiers" ON public.donnees_financieres
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = donnees_financieres.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete financials of their dossiers" ON public.donnees_financieres
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = donnees_financieres.dossier_id AND dossiers.user_id = auth.uid()
  ));

-- RLS Policies for scoring_history (based on dossier ownership)
CREATE POLICY "Users can view scoring of their dossiers" ON public.scoring_history
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = scoring_history.dossier_id AND dossiers.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert scoring to their dossiers" ON public.scoring_history
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.dossiers WHERE dossiers.id = scoring_history.dossier_id AND dossiers.user_id = auth.uid()
  ));

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_dossiers_user_id ON public.dossiers(user_id);
CREATE INDEX idx_dossiers_status ON public.dossiers(status);
CREATE INDEX idx_dossiers_created_at ON public.dossiers(created_at DESC);
CREATE INDEX idx_documents_dossier_id ON public.documents(dossier_id);
CREATE INDEX idx_donnees_financieres_dossier_id ON public.donnees_financieres(dossier_id);