-- Create analysis history table
CREATE TABLE public.analyse_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Extracted data snapshot
    extracted_data JSONB NOT NULL,
    
    -- Score data
    score_global INTEGER NOT NULL,
    score_solvabilite INTEGER,
    score_rentabilite INTEGER,
    score_structure INTEGER,
    score_activite INTEGER,
    
    -- Recommendation
    recommandation TEXT,
    seuil_accordable NUMERIC,
    
    -- AI analysis
    analyse_sectorielle JSONB,
    synthese_narrative JSONB,
    models_used TEXT[],
    
    -- Metadata
    source_files TEXT[],
    confidence_extraction NUMERIC,
    version INTEGER DEFAULT 1,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.analyse_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analysis history"
ON public.analyse_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis history"
ON public.analyse_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis history"
ON public.analyse_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis history"
ON public.analyse_history
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_analyse_history_dossier ON public.analyse_history(dossier_id);
CREATE INDEX idx_analyse_history_user ON public.analyse_history(user_id);
CREATE INDEX idx_analyse_history_created ON public.analyse_history(created_at DESC);