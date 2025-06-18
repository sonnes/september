-- Create a new bucket for voice samples
INSERT INTO storage.buckets 
(id, name, public, allowed_mime_types) 
VALUES ('voice_samples', 'voice_samples', false, '{"audio/*"}');


-- Create a insert policy for the new bucket
CREATE POLICY "Allow authenticated uploads to voice_samples bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice_samples' and 
  owner_id::uuid = (select auth.uid())
);

-- Create a select policy for access to the bucket
CREATE POLICY "Allow authenticated access to voice_samples bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'voice_samples' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a update policy for the new bucket
CREATE POLICY "Allow authenticated updates to voice_samples bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING ( 
    bucket_id = 'voice_samples' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a delete policy for the new bucket
CREATE POLICY "Allow authenticated deletes from voice_samples bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING ( 
    bucket_id = 'voice_samples' and 
    (select auth.uid()) = owner_id::uuid 
);