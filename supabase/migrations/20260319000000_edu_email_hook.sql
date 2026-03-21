create or replace function public.hook_edu_email_only(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  email text;
  domain text;
begin
  email := lower(event->'user'->>'email');
  domain := split_part(email, '@', 2);

  if domain not like '%.edu' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Only .edu email addresses are allowed to sign up.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

-- Allow Supabase Auth to execute the function
grant execute
  on function public.hook_edu_email_only
  to supabase_auth_admin;

grant usage on schema public to supabase_auth_admin;

-- Block all other roles from calling it directly
revoke execute
  on function public.hook_edu_email_only
  from authenticated, anon, public;
