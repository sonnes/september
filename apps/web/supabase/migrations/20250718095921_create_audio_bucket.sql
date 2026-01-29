-- Create a new bucket for voice samples
INSERT INTO storage.buckets 
(id, name, public, allowed_mime_types) 
VALUES ('audio', 'audio', false, '{"audio/*"}');


-- Create a insert policy for the new bucket
CREATE POLICY "Allow authenticated uploads to audio bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio' and 
  owner_id::uuid = (select auth.uid())
);

-- Create a select policy for access to the bucket
CREATE POLICY "Allow authenticated access to audio bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'audio' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a update policy for the new bucket
CREATE POLICY "Allow authenticated updates to audio bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( 
    bucket_id = 'audio' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a delete policy for the new bucket
CREATE POLICY "Allow authenticated deletes from audio bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING ( 
    bucket_id = 'audio' and 
    (select auth.uid()) = owner_id::uuid 
);