-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  mpesa_paybill TEXT,
  mpesa_till TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_type enum
CREATE TYPE public.document_type AS ENUM ('menu', 'brochure', 'pricelist', 'event', 'notice', 'other');

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  allow_downloads BOOLEAN NOT NULL DEFAULT true,
  allow_donations BOOLEAN NOT NULL DEFAULT false,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  document_type public.document_type NOT NULL DEFAULT 'other',
  country TEXT,
  city TEXT,
  area TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Documents RLS policies
CREATE POLICY "View public documents or own documents"
  ON public.documents FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (user_id = auth.uid());

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Storage policies for PDFs bucket
CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pdfs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own PDFs or public document PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.documents 
        WHERE file_url = name AND is_public = true
      )
    )
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger for automatic profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();