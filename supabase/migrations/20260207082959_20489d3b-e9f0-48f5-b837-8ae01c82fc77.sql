-- Allow guest comments by making user_id nullable and adding guest_name
ALTER TABLE public.comments 
ALTER COLUMN user_id DROP NOT NULL;

-- Add guest_name column for anonymous commenters
ALTER TABLE public.comments 
ADD COLUMN guest_name text;

-- Update RLS policy for inserting comments to allow guest comments via service role
-- (The edge function uses service role key, so no user-level RLS policy needed for guest inserts)

-- Update the select policy to allow viewing all comments on allowed documents
DROP POLICY IF EXISTS "View comments on documents that allow comments" ON public.comments;
CREATE POLICY "View comments on documents that allow comments" 
ON public.comments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM documents 
  WHERE documents.id = comments.document_id 
  AND documents.allow_comments = true
));