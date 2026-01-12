-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- RLS Policies for documents bucket
-- Users can upload files to their own folder (based on dossier ownership)
CREATE POLICY "Users can upload documents to their dossiers"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE dossiers.id::text = (storage.foldername(name))[1] 
    AND dossiers.user_id = auth.uid()
  )
);

-- Users can view documents from their dossiers
CREATE POLICY "Users can view documents from their dossiers"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE dossiers.id::text = (storage.foldername(name))[1] 
    AND dossiers.user_id = auth.uid()
  )
);

-- Users can delete documents from their dossiers
CREATE POLICY "Users can delete documents from their dossiers"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.dossiers 
    WHERE dossiers.id::text = (storage.foldername(name))[1] 
    AND dossiers.user_id = auth.uid()
  )
);