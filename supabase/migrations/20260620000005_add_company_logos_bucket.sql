-- Company logos storage bucket and access policies

INSERT INTO storage.buckets (id, name, public)
VALUES ('company_logos', 'company_logos', true)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public access to company logos'
  ) THEN
    CREATE POLICY "Public access to company logos" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'company_logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can upload company logos'
  ) THEN
    CREATE POLICY "Employers can upload company logos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can update company logos'
  ) THEN
    CREATE POLICY "Employers can update company logos" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employers can delete company logos'
  ) THEN
    CREATE POLICY "Employers can delete company logos" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'company_logos' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
