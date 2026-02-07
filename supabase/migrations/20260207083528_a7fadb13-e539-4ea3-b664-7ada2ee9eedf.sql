-- Add bio/description field to profiles
ALTER TABLE public.profiles 
ADD COLUMN bio text;

-- Create ratings table for document ratings
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_fingerprint text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(document_id, user_id),
  UNIQUE(document_id, guest_fingerprint)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
ON public.ratings FOR SELECT
USING (true);

-- Authenticated users can insert/update their own ratings
CREATE POLICY "Users can insert their own rating"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rating"
ON public.ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to get document rating stats
CREATE OR REPLACE FUNCTION public.get_document_rating_stats(doc_id uuid)
RETURNS TABLE(average_rating numeric, total_ratings bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
    COUNT(*) as total_ratings
  FROM public.ratings
  WHERE document_id = doc_id;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_ratings_updated_at
BEFORE UPDATE ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();