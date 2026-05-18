-- admin_list_users and admin_get_user write audit rows via _admin_insert_audit.
-- STABLE marks them read-only in PostgREST, which rejects INSERT (HTTP 405).

ALTER FUNCTION public.admin_is_admin() VOLATILE;
ALTER FUNCTION public.admin_list_users(integer, integer, text, text, text, text) VOLATILE;
ALTER FUNCTION public.admin_get_user(uuid, text) VOLATILE;
