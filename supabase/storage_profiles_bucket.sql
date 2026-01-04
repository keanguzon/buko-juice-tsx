-- Create the storage bucket 'profiles'
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
on conflict (id) do nothing;

-- Set up access policies for the 'profiles' bucket

-- 1. Allow public access to view files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'profiles' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'profiles' and auth.role() = 'authenticated' );

-- 3. Allow users to update their own files (optional, if you want them to overwrite)
create policy "Users can update own files"
  on storage.objects for update
  using ( bucket_id = 'profiles' and auth.uid() = owner )
  with check ( bucket_id = 'profiles' and auth.uid() = owner );

-- 4. Allow users to delete their own files
create policy "Users can delete own files"
  on storage.objects for delete
  using ( bucket_id = 'profiles' and auth.uid() = owner );
