-- Optional Supabase cloud storage. Do not store patient identifiers.
create table if not exists public.audit_cases (
  id uuid primary key,
  case_number integer not null,
  audit_date date,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.audit_cases enable row level security;
-- For a private personal project, configure authentication before enabling browser writes.
-- Do NOT create an unrestricted anonymous write policy for clinical audit data.
