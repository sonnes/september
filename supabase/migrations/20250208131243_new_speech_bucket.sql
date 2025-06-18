-- Create a new bucket for speech files
INSERT INTO storage.buckets 
(id, name, public, allowed_mime_types) 
VALUES ('speech', 'speech', false, '{"audio/*"}');

-- Create a insert policy for the new bucket
CREATE POLICY "Allow authenticated uploads to speech bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'speech' and
  owner_id::uuid = (select auth.uid())
);

-- Create a select policy for access to the bucket
CREATE POLICY "Allow authenticated access to speech bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING ( 
    bucket_id = 'speech' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a delete policy for the new bucket
CREATE POLICY "Allow authenticated deletes from speech bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING ( 
  bucket_id = 'speech' and 
  (select auth.uid()) = owner_id::uuid 
);