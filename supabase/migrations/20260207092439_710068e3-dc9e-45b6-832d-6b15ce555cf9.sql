-- Add order_url column for menu documents to store WhatsApp/website order links
ALTER TABLE public.documents
ADD COLUMN order_url text DEFAULT NULL;