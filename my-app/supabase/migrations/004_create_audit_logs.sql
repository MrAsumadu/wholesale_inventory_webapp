-- Audit log table for tracking all user actions
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   text not null,
  action      text not null,
  user_id     uuid not null,
  user_email  text not null,
  old_values  jsonb,
  new_values  jsonb,
  created_at  timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index idx_audit_logs_entity_type on public.audit_logs (entity_type);
create index idx_audit_logs_user_id on public.audit_logs (user_id);

-- RLS: append-only for authenticated users
alter table public.audit_logs enable row level security;

create policy "Authenticated users can read audit logs"
  on public.audit_logs for select
  to authenticated
  using (true);

create policy "Users can insert their own audit logs"
  on public.audit_logs for insert
  to authenticated
  with check (auth.uid() = user_id);
