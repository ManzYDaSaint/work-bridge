-- Profile storage buckets for seeker avatars and resumes.

-- Avatar storage bucket and access policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public access to avatars'
  ) THEN
    CREATE POLICY "Public access to avatars" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'avatars');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can upload avatars'
  ) THEN
    CREATE POLICY "Seekers can upload avatars" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can update avatars'
  ) THEN
    CREATE POLICY "Seekers can update avatars" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can delete avatars'
  ) THEN
    CREATE POLICY "Seekers can delete avatars" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- Resume storage bucket and access policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public access to resumes'
  ) THEN
    CREATE POLICY "Public access to resumes" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'resumes');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can upload resumes'
  ) THEN
    CREATE POLICY "Seekers can upload resumes" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can update resumes'
  ) THEN
    CREATE POLICY "Seekers can update resumes" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Seekers can delete resumes'
  ) THEN
    CREATE POLICY "Seekers can delete resumes" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
