
ALTER TABLE public.documents ADD COLUMN slug text UNIQUE;

-- Create a function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_slug(title text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens, remove non-alphanumeric
  base_slug := lower(trim(title));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '[\s-]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Truncate to reasonable length
  base_slug := left(base_slug, 80);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.documents WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION public.set_document_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_document_slug_trigger
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.set_document_slug();

-- Generate slugs for existing documents
UPDATE public.documents SET slug = public.generate_slug(title) WHERE slug IS NULL;
