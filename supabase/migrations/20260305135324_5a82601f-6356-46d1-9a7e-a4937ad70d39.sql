
CREATE TABLE public.document_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

-- Document owners can read their view logs
CREATE POLICY "Owners can view their document views"
ON public.document_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_views.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Anyone can insert a view (public tracking)
CREATE POLICY "Anyone can insert views"
ON public.document_views
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
