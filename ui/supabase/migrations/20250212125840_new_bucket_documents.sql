-- Create a new bucket for documents
INSERT INTO storage.buckets 
(id, name, public, allowed_mime_types) 
VALUES ('documents', 'documents', false, '{"application/pdf","image/png","image/jpeg","image/jpg"}');


-- Create a insert policy for the new bucket
CREATE POLICY "Allow authenticated uploads to documents bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' and
  owner_id::uuid = (select auth.uid())
);

-- Create a select policy for access to the bucket
CREATE POLICY "Allow authenticated access to documents bucket"
ON storage.objects
FOR SELECT
TO authenticated
USING ( 
    bucket_id = 'documents' and 
    (select auth.uid()) = owner_id::uuid 
);

-- Create a delete policy for the new bucket
CREATE POLICY "Allow authenticated deletes from documents bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING ( 
  bucket_id = 'documents' and 
  (select auth.uid()) = owner_id::uuid 
);