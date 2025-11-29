create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  war_number int not null,
  day_number int not null,
  territories jsonb not null
);

create index if not exists snapshots_created_at_idx on public.snapshots(created_at desc);

create table if not exists public.territory_diffs (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  period text not null check (period in ('daily','weekly')),
  changes jsonb not null
);

create index if not exists territory_diffs_period_idx on public.territory_diffs(period, generated_at desc);
