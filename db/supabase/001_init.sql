-- =====================================================================
-- 성경-말씀숲 · 서버 DB (Supabase / PostgreSQL) · 스키마 v1
-- 쓰는 시점: 다음 업데이트 (카카오·Google 로그인, 기록 동기화, 우리 포도원)
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여 넣고 실행 (여러 번 실행해도 안전)
-- ⚠️ 폰 안 DB용 파일(db/sqlite/001_init.sql)은 여기서 실행하지 마세요.
--
-- 원칙
--  * 로그인은 Supabase Auth (auth.users). 모든 사용자 데이터는 user_id로 묶는다.
--  * 기기 SQLite(db/sqlite/001_init.sql)와 같은 컬럼 이름을 써서 그대로 동기화한다.
--  * 모든 테이블에 RLS(행 단위 보안)를 켜서 내 데이터만 읽고 쓸 수 있게 한다.
--  * 기도는 기본 비공개. 우리 포도원에는 사용자가 '나누기'를 고른 것만 올라간다.
--  * 알림 시간은 기기마다 다르므로 서버에 저장하지 않는다.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 공통: updated_at 자동 갱신 함수
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. 프로필 (가입하면 자동 생성)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text check (nickname is null or char_length(nickname) between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. 설정·진도 (기기 app_settings 중 동기화할 것만)
-- ---------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  lang_ko          boolean not null default true,
  lang_en          boolean not null default false,
  font_size        text    not null default 'm' check (font_size in ('s', 'm', 'l', 'xl')),
  theme            text    not null default 'system' check (theme in ('system', 'light', 'dark')),
  next_book        text    not null default 'GEN' check (char_length(next_book) = 3),
  next_chapter     smallint not null default 1 check (next_chapter >= 1),
  pending_book     text    check (pending_book is null or char_length(pending_book) = 3),
  pending_chapter  smallint check (pending_chapter is null or pending_chapter >= 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (lang_ko or lang_en),
  check ((pending_book is null) = (pending_chapter is null))
);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 3. 하루 기록
-- ---------------------------------------------------------------------
create table if not exists public.day_logs (
  user_id          uuid not null references auth.users (id) on delete cascade,
  date             date not null,                 -- 기기 현지 날짜
  book             text not null check (char_length(book) = 3),
  chapter          smallint not null check (chapter >= 1),
  read_at          timestamptz,
  prayer           text check (prayer is null or char_length(btrim(prayer)) between 1 and 100),
  linked_verse_id  text,                          -- saved_verses.verse_id
  completed_at     timestamptz,
  revived          boolean not null default false,
  revived_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, date),
  check (completed_at is null or (read_at is not null and prayer is not null)),
  check (not revived or (completed_at is null and revived_at is not null))
);

create index if not exists idx_day_logs_user_updated on public.day_logs (user_id, updated_at);
create index if not exists idx_day_logs_user_completed on public.day_logs (user_id, date) where completed_at is not null;

-- 미션 완료는 되돌리지 않는다
create or replace function public.keep_completed()
returns trigger
language plpgsql
as $$
begin
  if old.completed_at is not null and new.completed_at is null then
    raise exception 'completed mission cannot be undone';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. 저장한 구절
-- ---------------------------------------------------------------------
create table if not exists public.saved_verses (
  user_id     uuid not null references auth.users (id) on delete cascade,
  verse_id    text not null,                     -- '{BOOK}.{장}.{절}' 예: 'GEN.1.3'
  book        text not null check (char_length(book) = 3),
  chapter     smallint not null check (chapter >= 1),
  verse       smallint not null check (verse >= 1),
  preview     text not null check (char_length(preview) <= 40),
  saved_at    timestamptz not null default now(),
  deleted_at  timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (user_id, verse_id),
  check (verse_id = book || '.' || chapter || '.' || verse)
);

create index if not exists idx_saved_verses_user_updated on public.saved_verses (user_id, updated_at);

-- ---------------------------------------------------------------------
-- 5. 우리 포도원 (그룹) — 열매 맺는 문화
-- ---------------------------------------------------------------------
create table if not exists public.vineyards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 30),
  invite_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.vineyard_members (
  vineyard_id  uuid not null references public.vineyards (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (vineyard_id, user_id)
);

create index if not exists idx_vineyard_members_user on public.vineyard_members (user_id);

-- 함께 맺은 열매: 미션을 마친 날 '나누기'를 고르면 1행 (기도 공개는 선택)
create table if not exists public.shared_fruits (
  id           uuid primary key default gen_random_uuid(),
  vineyard_id  uuid not null references public.vineyards (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  date         date not null,
  book         text not null check (char_length(book) = 3),
  chapter      smallint not null check (chapter >= 1),
  prayer       text check (prayer is null or char_length(btrim(prayer)) between 1 and 100), -- null이면 기도 비공개
  created_at   timestamptz not null default now(),
  unique (vineyard_id, user_id, date),
  foreign key (user_id, date) references public.day_logs (user_id, date) on delete cascade
);

create index if not exists idx_shared_fruits_vineyard on public.shared_fruits (vineyard_id, created_at desc);

-- 포도원 응원 (열매에 '아멘' 한 번)
create table if not exists public.fruit_cheers (
  fruit_id    uuid not null references public.shared_fruits (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (fruit_id, user_id)
);

-- ---------------------------------------------------------------------
-- 6. 트리거 연결
-- ---------------------------------------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated       before update on public.profiles       for each row execute function public.set_updated_at();
drop trigger if exists trg_user_settings_updated on public.user_settings;
create trigger trg_user_settings_updated  before update on public.user_settings  for each row execute function public.set_updated_at();
drop trigger if exists trg_day_logs_updated on public.day_logs;
create trigger trg_day_logs_updated       before update on public.day_logs       for each row execute function public.set_updated_at();
drop trigger if exists trg_day_logs_keep on public.day_logs;
create trigger trg_day_logs_keep          before update on public.day_logs       for each row execute function public.keep_completed();
drop trigger if exists trg_saved_verses_updated on public.saved_verses;
create trigger trg_saved_verses_updated   before update on public.saved_verses   for each row execute function public.set_updated_at();
drop trigger if exists trg_vineyards_updated on public.vineyards;
create trigger trg_vineyards_updated      before update on public.vineyards      for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 7. 포도원 멤버 확인 (RLS에서 재귀를 피하려고 security definer)
-- ---------------------------------------------------------------------
create or replace function public.is_vineyard_member(p_vineyard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vineyard_members
    where vineyard_id = p_vineyard_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 8. RLS (행 단위 보안)
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.user_settings    enable row level security;
alter table public.day_logs         enable row level security;
alter table public.saved_verses     enable row level security;
alter table public.vineyards        enable row level security;
alter table public.vineyard_members enable row level security;
alter table public.shared_fruits    enable row level security;
alter table public.fruit_cheers     enable row level security;

-- 내 데이터는 나만
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles      for all using (id = auth.uid())      with check (id = auth.uid());
drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own day logs" on public.day_logs;
create policy "own day logs" on public.day_logs      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own saved verses" on public.saved_verses;
create policy "own saved verses" on public.saved_verses  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 같은 포도원 사람의 닉네임은 볼 수 있음
drop policy if exists "vineyard mates profile" on public.profiles;
create policy "vineyard mates profile" on public.profiles for select using (
  exists (
    select 1 from public.vineyard_members m
    where m.user_id = profiles.id and public.is_vineyard_member(m.vineyard_id)
  )
);

-- 포도원: 멤버만 보기, 만든 사람만 수정·삭제, 만들기는 본인 명의로
drop policy if exists "members read vineyard" on public.vineyards;
create policy "members read vineyard" on public.vineyards for select using (public.is_vineyard_member(id));
drop policy if exists "create own vineyard" on public.vineyards;
create policy "create own vineyard" on public.vineyards for insert with check (owner_id = auth.uid());
drop policy if exists "owner updates vineyard" on public.vineyards;
create policy "owner updates vineyard" on public.vineyards for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner deletes vineyard" on public.vineyards;
create policy "owner deletes vineyard" on public.vineyards for delete using (owner_id = auth.uid());

-- 멤버 목록: 같은 포도원 멤버만 보기, 나가기는 본인만 (가입은 join_vineyard 함수로만)
drop policy if exists "members read members" on public.vineyard_members;
create policy "members read members" on public.vineyard_members for select using (public.is_vineyard_member(vineyard_id));
drop policy if exists "leave vineyard" on public.vineyard_members;
create policy "leave vineyard" on public.vineyard_members for delete using (user_id = auth.uid());

-- 함께 맺은 열매: 멤버만 보기, 내 것만 올리기·지우기
drop policy if exists "members read fruits" on public.shared_fruits;
create policy "members read fruits" on public.shared_fruits for select using (public.is_vineyard_member(vineyard_id));
drop policy if exists "share own fruit" on public.shared_fruits;
create policy "share own fruit" on public.shared_fruits for insert with check (user_id = auth.uid() and public.is_vineyard_member(vineyard_id));
drop policy if exists "delete own fruit" on public.shared_fruits;
create policy "delete own fruit" on public.shared_fruits for delete using (user_id = auth.uid());

-- 응원: 같은 포도원 열매에만
drop policy if exists "members read cheers" on public.fruit_cheers;
create policy "members read cheers" on public.fruit_cheers for select using (
  exists (select 1 from public.shared_fruits f where f.id = fruit_id and public.is_vineyard_member(f.vineyard_id))
);
drop policy if exists "cheer as member" on public.fruit_cheers;
create policy "cheer as member" on public.fruit_cheers for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.shared_fruits f where f.id = fruit_id and public.is_vineyard_member(f.vineyard_id))
);
drop policy if exists "remove own cheer" on public.fruit_cheers;
create policy "remove own cheer" on public.fruit_cheers for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 9. 함수 (앱에서 supabase.rpc('이름')으로 호출)
-- ---------------------------------------------------------------------

-- 포도원 만들기: 만든 사람을 owner로 자동 가입
create or replace function public.create_vineyard(p_name text)
returns public.vineyards
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.vineyards;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  insert into public.vineyards (name, owner_id) values (p_name, auth.uid()) returning * into v;
  insert into public.vineyard_members (vineyard_id, user_id, role) values (v.id, auth.uid(), 'owner');
  return v;
end;
$$;

-- 초대 코드로 포도원 가입
create or replace function public.join_vineyard(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select id into v_id from public.vineyards where invite_code = upper(btrim(p_invite_code));
  if v_id is null then raise exception 'invalid invite code'; end if;
  insert into public.vineyard_members (vineyard_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end;
$$;

-- 내 통계 (기기 v_stats와 같은 값)
create or replace function public.my_stats()
returns table (completed_days bigint, grapes bigint, growth_day bigint, saved_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.day_logs where user_id = auth.uid() and completed_at is not null),
    (select count(*) from public.day_logs where user_id = auth.uid() and completed_at is not null),
    (select count(*) from public.day_logs where user_id = auth.uid() and completed_at is not null) + 1,
    (select count(*) from public.saved_verses where user_id = auth.uid() and deleted_at is null);
$$;

-- 우리 포도원 요약: 멤버 수, 함께 맺은 열매 수, 오늘 열매 맺은 사람 수
create or replace function public.vineyard_summary(p_vineyard_id uuid, p_today date)
returns table (members bigint, total_fruits bigint, fruits_today bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.vineyard_members where vineyard_id = p_vineyard_id),
    (select count(*) from public.shared_fruits   where vineyard_id = p_vineyard_id),
    (select count(*) from public.shared_fruits   where vineyard_id = p_vineyard_id and date = p_today);
$$;

-- 계정 삭제 (Google Play 정책: 앱 안에서 계정과 데이터를 지울 수 있어야 함)
-- auth.users를 지우면 on delete cascade로 모든 데이터가 함께 지워진다.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.create_vineyard(text) from public, anon;
grant execute on function public.create_vineyard(text) to authenticated;
revoke all on function public.join_vineyard(text) from public, anon;
grant execute on function public.join_vineyard(text) to authenticated;

-- =====================================================================
-- 동기화 쿼리 예시 (supabase-js)
-- =====================================================================
-- [올리기] 마지막 동기화 뒤 바뀐 기기 행을 upsert
--   supabase.from('day_logs').upsert(rows, { onConflict: 'user_id,date' })
--   supabase.from('saved_verses').upsert(rows, { onConflict: 'user_id,verse_id' })
-- [받기] 서버에서 바뀐 행
--   supabase.from('day_logs').select('*').gt('updated_at', lastSyncedAt)
-- 병합 규칙은 명세서 12장 참고 (updated_at이 늦은 쪽 우선, completed_at은 한 번 생기면 유지)
