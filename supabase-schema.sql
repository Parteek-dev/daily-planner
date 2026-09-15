-- ============================================================
--  Daily Planner — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. TASKS ────────────────────────────────────────────────
create table if not exists public.tasks (
  id                    text        primary key,
  user_id               uuid        not null references auth.users(id) on delete cascade,
  title                 text        not null,
  description           text        default '',
  topic                 text        default 'Personal',
  duration              int         default 30,          -- estimated minutes
  actual_duration       int,                             -- actual minutes spent
  date                  text        not null,            -- YYYY-MM-DD
  due_time              text,                            -- HH:MM or null
  completed             boolean     default false,
  completed_at          timestamptz,
  created_at            timestamptz default now(),
  priority              text,                            -- 'high' | 'medium' | 'low' | null
  depends_on            text[]      default '{}',        -- array of task IDs
  subtasks              jsonb       default '[]',        -- [{id, title, completed}]
  recurrence            text        default 'none',      -- 'none'|'daily'|'weekly'|'weekdays'|'custom'
  recurrence_end_date   text,                            -- YYYY-MM-DD or null
  recurrence_parent_id  text,                            -- null for root recurring tasks
  custom_recurrence_days int[]      default '{}'         -- e.g. [1,3,5] for Mon/Wed/Fri
);

-- ── 2. TOPICS ───────────────────────────────────────────────
create table if not exists public.topics (
  id        serial      primary key,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  name      text        not null,
  color     text        not null default '#64748b',
  unique (user_id, name)
);

-- ── 3. NOTES ────────────────────────────────────────────────
create table if not exists public.notes (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  date      text        not null,                        -- YYYY-MM-DD
  content   text        default '',
  primary key (user_id, date)
);

-- ── 4. GOALS ────────────────────────────────────────────────
create table if not exists public.goals (
  user_id             uuid    primary key references auth.users(id) on delete cascade,
  daily_task_target   int     default 3
);

-- ── 5. TEMPLATES ────────────────────────────────────────────
create table if not exists public.templates (
  id                      text        primary key,
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  name                    text        not null,
  title                   text        not null,
  description             text        default '',
  topic                   text        default 'Personal',
  duration                int         default 30,
  due_time                text,
  subtasks                jsonb       default '[]',
  recurrence              text        default 'none',
  custom_recurrence_days  int[]       default '{}',
  created_at              timestamptz default now()
);

-- ── 6. ARCHIVED TASKS ───────────────────────────────────────
create table if not exists public.archived_tasks (
  id                    text        primary key,
  user_id               uuid        not null references auth.users(id) on delete cascade,
  title                 text        not null,
  description           text        default '',
  topic                 text        default 'Personal',
  duration              int         default 30,
  actual_duration       int,
  date                  text        not null,
  due_time              text,
  completed             boolean     default false,
  completed_at          timestamptz,
  created_at            timestamptz default now(),
  archived_at           timestamptz default now(),
  priority              text,
  depends_on            text[]      default '{}',
  subtasks              jsonb       default '[]',
  recurrence            text        default 'none',
  recurrence_end_date   text,
  recurrence_parent_id  text,
  custom_recurrence_days int[]      default '{}'
);

-- ============================================================
--  ROW LEVEL SECURITY (RLS)
--  Every user can only read/write their own rows.
-- ============================================================

alter table public.tasks           enable row level security;
alter table public.topics          enable row level security;
alter table public.notes           enable row level security;
alter table public.goals           enable row level security;
alter table public.templates       enable row level security;
alter table public.archived_tasks  enable row level security;

-- Tasks
create policy "tasks: users manage own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Topics
create policy "topics: users manage own" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notes
create policy "notes: users manage own" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goals
create policy "goals: users manage own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Templates
create policy "templates: users manage own" on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Archived tasks
create policy "archived_tasks: users manage own" on public.archived_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
--  INDEXES — speed up the most common queries
-- ============================================================

create index if not exists tasks_user_date_idx    on public.tasks(user_id, date);
create index if not exists tasks_user_id_idx      on public.tasks(user_id);
create index if not exists topics_user_id_idx     on public.topics(user_id);
create index if not exists notes_user_date_idx    on public.notes(user_id, date);
create index if not exists templates_user_id_idx  on public.templates(user_id);
create index if not exists archived_user_id_idx   on public.archived_tasks(user_id);

-- ============================================================
--  DEFAULT TOPICS FUNCTION
--  Auto-inserts default topics for new users on first sign-up.
--  Trigger fires after a new row is inserted into auth.users.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.topics (user_id, name, color) values
    (new.id, 'Learning',  '#3b82f6'),
    (new.id, 'Work',      '#22c55e'),
    (new.id, 'Health',    '#f97316'),
    (new.id, 'Personal',  '#a855f7');

  insert into public.goals (user_id, daily_task_target)
    values (new.id, 3);

  return new;
end;
$$;

-- Drop the trigger first if it already exists (safe to re-run)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
