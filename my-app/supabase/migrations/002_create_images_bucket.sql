-- Create a public bucket (public read, authenticated write)
insert into storage.buckets (id, name, public)
values ('images', 'images', true);

-- Allow authenticated users to upload images
create policy "Authenticated users can upload images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'images');

-- Allow authenticated users to update (replace) images
create policy "Authenticated users can update images"
on storage.objects for update
to authenticated
using (bucket_id = 'images');

-- Allow authenticated users to delete images
create policy "Authenticated users can delete images"
on storage.objects for delete
to authenticated
using (bucket_id = 'images');

-- Allow public read access for images
create policy "Public read access for images"
on storage.objects for select
to public
using (bucket_id = 'images');
