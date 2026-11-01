-- Run after 01_schema.sql. Creates the file buckets and their rules.
insert into storage.buckets (id, name, public) values ('homework', 'homework', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Homework files: private. A student can use only their own folder (named with their user id); the instructor sees all.
create policy hw_read   on storage.objects for select to authenticated using (bucket_id = 'homework' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_instructor()));
create policy hw_insert on storage.objects for insert to authenticated with check (bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text);
create policy hw_update on storage.objects for update to authenticated using (bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text);
create policy hw_delete on storage.objects for delete to authenticated using (bucket_id = 'homework' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_instructor()));

-- Profile photos: anyone can view; you can only write to your own folder.
create policy av_insert on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy av_update on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
