-- admin_get_marketing_email_settings and admin_get_marketing_email_queue_stats call
-- admin_is_admin() which is VOLATILE; PostgREST requires functions that call VOLATILE
-- functions to also be VOLATILE.

ALTER FUNCTION public.admin_get_marketing_email_settings(text) VOLATILE;
ALTER FUNCTION public.admin_get_marketing_email_queue_stats() VOLATILE;
