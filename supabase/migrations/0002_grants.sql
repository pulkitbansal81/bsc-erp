-- Service role ko tables ka access (project setting "auto grant" off hai — sahi hai,
-- par usse service_role ko bhi grant nahi mila tha). anon/authenticated ko KUCH NAHI.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
-- double-safety: anon/authenticated se sab kuch wapas le lo (agar kahin se mila ho)
revoke all on all tables in schema public from anon, authenticated;
