-- Table pour l'historique des rapports générés
CREATE TABLE public.reports_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    dossier_id UUID REFERENCES public.dossiers(id) ON DELETE SET NULL,
    analyse_id UUID REFERENCES public.analyse_history(id) ON DELETE SET NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('pdf', 'word')),
    file_name TEXT NOT NULL,
    sections_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    raison_sociale TEXT,
    siren TEXT,
    score_global INTEGER
);

-- Table pour les préférences de sections sauvegardées
CREATE TABLE public.report_section_preferences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    sections_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_section_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports_history
CREATE POLICY "Users can view their own report history"
ON public.reports_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own report history"
ON public.reports_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own report history"
ON public.reports_history FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for report_section_preferences
CREATE POLICY "Users can view their own preferences"
ON public.report_section_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences"
ON public.report_section_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.report_section_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_report_section_preferences_updated_at
BEFORE UPDATE ON public.report_section_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();