-- Create policy to allow authenticated users to update their own documents
CREATE POLICY "Allow authenticated users to update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  and (select auth.uid()) = owner_id::uuid
);