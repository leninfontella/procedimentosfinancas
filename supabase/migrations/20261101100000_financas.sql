-- Procedimentos de Finanças — estrutura completa para o projeto Supabase
-- https://imcbpiltrxyykwouekbp.supabase.co
--
-- Este arquivo é autossuficiente: rode-o inteiro no SQL Editor do projeto novo.
-- Pode ser executado mais de uma vez sem erro.

-- ------------------------------------------------------------------
-- Perfil exibido no app (foto, nome e cidade), um por usuário.
-- ------------------------------------------------------------------
create table if not exists public.perfis (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  cidade text not null default '' check (char_length(cidade) <= 80),
  foto_path text check (char_length(foto_path) <= 300),
  updated_at timestamptz not null default now()
);

alter table public.perfis enable row level security;

drop policy if exists "Usuários podem consultar o próprio perfil" on public.perfis;
create policy "Usuários podem consultar o próprio perfil"
on public.perfis for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem criar o próprio perfil" on public.perfis;
create policy "Usuários podem criar o próprio perfil"
on public.perfis for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem atualizar o próprio perfil" on public.perfis;
create policy "Usuários podem atualizar o próprio perfil"
on public.perfis for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------
-- Despesas
-- grupo_id liga as ocorrências criadas juntas: despesa fixa (12 meses)
-- ou repetição em parcelas (parcela / total_parcelas).
-- ------------------------------------------------------------------
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  descricao text not null check (char_length(descricao) between 1 and 160),
  valor numeric(12, 2) not null check (valor >= 0),
  data date not null,
  pago boolean not null default false,
  categoria text not null check (char_length(categoria) between 1 and 60),
  conta text not null default 'Carteira' check (char_length(conta) between 1 and 60),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  observacoes text check (char_length(observacoes) <= 2000),
  anexo_path text check (char_length(anexo_path) <= 300),
  favorita boolean not null default false,
  fixa boolean not null default false,
  lembrete boolean not null default false,
  ignorada boolean not null default false,
  grupo_id uuid,
  parcela smallint check (parcela between 1 and 360),
  total_parcelas smallint check (total_parcelas between 1 and 360),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.despesas enable row level security;

drop policy if exists "Usuários podem consultar as próprias despesas" on public.despesas;
create policy "Usuários podem consultar as próprias despesas"
on public.despesas for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem criar as próprias despesas" on public.despesas;
create policy "Usuários podem criar as próprias despesas"
on public.despesas for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem atualizar as próprias despesas" on public.despesas;
create policy "Usuários podem atualizar as próprias despesas"
on public.despesas for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários podem excluir as próprias despesas" on public.despesas;
create policy "Usuários podem excluir as próprias despesas"
on public.despesas for delete to authenticated
using ((select auth.uid()) = user_id);

create index if not exists despesas_user_data_idx on public.despesas (user_id, data desc);
create index if not exists despesas_grupo_idx on public.despesas (grupo_id) where grupo_id is not null;

-- ------------------------------------------------------------------
-- Arquivos: buckets privados, cada usuário só acessa a própria pasta.
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('fotos-perfil', 'fotos-perfil', false, 5242880,
    array['image/jpeg', 'image/png', 'image/webp']),
  ('anexos', 'anexos', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Usuários podem consultar os próprios arquivos" on storage.objects;
create policy "Usuários podem consultar os próprios arquivos"
on storage.objects for select to authenticated
using (
  bucket_id in ('fotos-perfil', 'anexos')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Usuários podem enviar os próprios arquivos" on storage.objects;
create policy "Usuários podem enviar os próprios arquivos"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('fotos-perfil', 'anexos')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Usuários podem excluir os próprios arquivos" on storage.objects;
create policy "Usuários podem excluir os próprios arquivos"
on storage.objects for delete to authenticated
using (
  bucket_id in ('fotos-perfil', 'anexos')
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
