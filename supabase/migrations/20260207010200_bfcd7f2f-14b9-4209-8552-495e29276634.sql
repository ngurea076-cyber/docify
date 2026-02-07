-- Add google_maps_url column to documents table
ALTER TABLE public.documents
ADD COLUMN google_maps_url text;