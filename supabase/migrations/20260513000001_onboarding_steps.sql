create table if not exists public.onboarding_steps (
  user_id      uuid not null references auth.users(id) on delete cascade,
  step_key     text not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, step_key)
);

create index if not exists onboarding_steps_user_id_idx on public.onboarding_steps(user_id);

alter table public.onboarding_steps enable row level security;

create policy "Users can manage their own onboarding steps"
  on public.onboarding_steps
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
