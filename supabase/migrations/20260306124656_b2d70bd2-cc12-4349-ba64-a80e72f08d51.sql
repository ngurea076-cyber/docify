-- Change trigger to only fire on INSERT, preserving slug on edits
DROP TRIGGER IF EXISTS set_document_slug_trigger ON public.documents;

CREATE TRIGGER set_document_slug_trigger
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_slug();