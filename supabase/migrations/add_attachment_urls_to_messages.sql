-- Add attachment_urls column to messages table
-- This stores JSON array of uploaded file URLs from Supabase Storage

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_urls TEXT;

COMMENT ON COLUMN messages.attachment_urls IS 'JSON string containing array of uploaded file URLs with metadata';

-- Drop existing policies if they exist (cleanup from previous runs)
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete chat attachments" ON storage.objects;

-- Storage policies for chat-attachments bucket
-- Note: Using 'anon' role since app uses mock JWT tokens, not Supabase Auth
-- Allow anonymous users to upload files
CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow everyone to view chat attachments (public bucket)
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- Allow anonymous users to delete uploads
CREATE POLICY "Anyone can delete chat attachments"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'chat-attachments');
