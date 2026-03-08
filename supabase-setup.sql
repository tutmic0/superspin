-- Run this in Supabase SQL Editor

create table if not exists users (
  id text primary key,
  username text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Add RLS
alter table users enable row level security;
create policy "Anyone can view users" on users for select using (true);
create policy "Anyone can upsert users" on users for insert with check (true);
create policy "Anyone can update users" on users for update using (true);

-- Also add RLS to existing tables if not done
alter table giveaways enable row level security;
alter table participants enable row level security;
alter table winners enable row level security;

create policy "Anyone can view giveaways" on giveaways for select using (true);
create policy "Anyone can insert giveaways" on giveaways for insert with check (true);
create policy "Anyone can update giveaways" on giveaways for update using (true);

create policy "Anyone can view participants" on participants for select using (true);
create policy "Anyone can insert participants" on participants for insert with check (true);

create policy "Anyone can view winners" on winners for select using (true);
create policy "Anyone can insert winners" on winners for insert with check (true);
