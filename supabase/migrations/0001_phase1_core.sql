-- =============================================================================
-- Julgados e Comentados — Migration 0001: núcleo da Fase 1
-- =============================================================================
-- Idempotente e versionada. Cobre: taxonomias, pessoas, pipeline, episódios,
-- histórico de etapas, checklists (versionados), presets de import e settings.
-- Tabelas de roteiro/citações (Fase 2), mensagens (Fase 3) e métricas (Fase 4)
-- entram em migrations próprias das suas fases.
--
-- RLS: sistema de USUÁRIO ÚNICO. Em vez de owner_id por linha, usamos política
-- "authenticated-only" — qualquer usuário autenticado (o único usuário) acessa;
-- o papel anônimo é bloqueado. Igualmente seguro para 1 usuário e evita o atrito
-- de posse em seed. Migrar para owner_id/multiusuário é aditivo e fica para o
-- (improvável) dia em que multiusuário sair do "fora de escopo v1".
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helper: manter updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Helper: aplica RLS "authenticated-only" e trigger de updated_at a uma tabela.
-- Wrapper IMMUTABLE para full-text pt-BR. O cast text->regconfig faz lookup no
-- catálogo (stable), então to_tsvector('portuguese', ...) não pode ser usado
-- direto numa coluna gerada. Fixar a config aqui é genuinamente imutável.
create or replace function public.pt_tsv(txt text)
returns tsvector
language sql
immutable
strict
as $$
  select to_tsvector('portuguese'::regconfig, txt);
$$;

-- tsvector de pessoa. Encapsula array_to_string (marcado STABLE no catálogo, mas
-- determinístico para text[]) para que a coluna gerada seja considerada imutável.
create or replace function public.pessoa_tsv(
  nome text, cargo text, comarca text, tags text[], notas text)
returns tsvector
language sql
immutable
as $$
  select to_tsvector('portuguese'::regconfig,
    coalesce(nome,'') || ' ' || coalesce(cargo,'') || ' ' ||
    coalesce(comarca,'') || ' ' || coalesce(array_to_string(tags,' '),'') || ' ' ||
    coalesce(notas,''));
$$;

create or replace function public.apply_standard_policies(tbl regclass)
returns void
language plpgsql
as $$
declare
  tname text := tbl::text;
begin
  execute format('alter table %s enable row level security', tname);
  execute format($p$
    drop policy if exists "authenticated_all" on %s;
    create policy "authenticated_all" on %s
      for all to authenticated using (true) with check (true);
  $p$, tname, tname);
end;
$$;

-- ---------------------------------------------------------------------------
-- settings — chave/valor global (single-user)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- eixos_tematicos — taxonomia editável pelo usuário
-- ---------------------------------------------------------------------------
create table if not exists public.eixos_tematicos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  cor         text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists eixos_tematicos_nome_uk on public.eixos_tematicos (lower(nome));

-- ---------------------------------------------------------------------------
-- pipeline_stages — etapas do Kanban, CRUD/reordenáveis
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_stages (
  id                        uuid primary key default gen_random_uuid(),
  nome                      text not null,
  ordem                     int not null default 0,
  cor                       text,
  exige_checklist_completo  boolean not null default false,
  ativo                     boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pessoas — CRM. Só pessoas vinculadas a episódios (AT MEMBROS fica no client).
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'genero_pessoa') then
    create type public.genero_pessoa as enum ('feminino','masculino','outro','nao_informado');
  end if;
end $$;

create table if not exists public.pessoas (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  tratamento        text,
  cargo_atual       text,
  comarca_lotacao   text,
  email             text,
  telefone          text,
  instagram         text,
  genero            public.genero_pessoa not null default 'nao_informado',
  origem            text not null default 'manual' check (origem in ('manual','at_membros')),
  tags              text[] not null default '{}',
  notas             text,
  campos_extras     jsonb not null default '{}'::jsonb,
  anonimizada       boolean not null default false,
  search_tsv        tsvector generated always as (
    public.pessoa_tsv(nome, cargo_atual, comarca_lotacao, tags, notas)
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists pessoas_search_idx on public.pessoas using gin (search_tsv);
create index if not exists pessoas_tags_idx on public.pessoas using gin (tags);

-- ---------------------------------------------------------------------------
-- episodios
-- ---------------------------------------------------------------------------
create table if not exists public.episodios (
  id                uuid primary key default gen_random_uuid(),
  numero            int,
  titulo            text,
  tema              text,
  eixo_id           uuid references public.eixos_tematicos(id) on delete set null,
  host_id           uuid references public.pessoas(id) on delete set null,
  data_gravacao     timestamptz,
  data_lancamento   date,
  duracao_seg       int,
  stage_id          uuid references public.pipeline_stages(id) on delete set null,
  links             jsonb not null default '{}'::jsonb,
  notas             text,
  campos_extras     jsonb not null default '{}'::jsonb,
  search_tsv        tsvector generated always as (
    public.pt_tsv(coalesce(titulo,'') || ' ' || coalesce(tema,''))
  ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Número do episódio é a chave natural para dedup do import "Controle".
create unique index if not exists episodios_numero_uk on public.episodios (numero) where numero is not null;
create index if not exists episodios_search_idx on public.episodios using gin (search_tsv);
create index if not exists episodios_stage_idx on public.episodios (stage_id);
create index if not exists episodios_eixo_idx on public.episodios (eixo_id);

-- ---------------------------------------------------------------------------
-- episodio_pessoas — N:N com papel
-- ---------------------------------------------------------------------------
create table if not exists public.episodio_pessoas (
  episodio_id  uuid not null references public.episodios(id) on delete cascade,
  pessoa_id    uuid not null references public.pessoas(id) on delete cascade,
  papel        text not null check (papel in ('convidado','host','participacao_especial','cogitado')),
  ordem        int not null default 0,
  created_at   timestamptz not null default now(),
  primary key (episodio_id, pessoa_id, papel)
);
create index if not exists episodio_pessoas_pessoa_idx on public.episodio_pessoas (pessoa_id);

-- ---------------------------------------------------------------------------
-- stage_history — trilha para métricas de tempo de produção
-- ---------------------------------------------------------------------------
create table if not exists public.stage_history (
  id           uuid primary key default gen_random_uuid(),
  episodio_id  uuid not null references public.episodios(id) on delete cascade,
  stage_id     uuid not null references public.pipeline_stages(id) on delete cascade,
  entrou_em    timestamptz not null default now(),
  saiu_em      timestamptz
);
create index if not exists stage_history_episodio_idx on public.stage_history (episodio_id);
-- No máximo uma etapa "aberta" (saiu_em null) por episódio.
create unique index if not exists stage_history_open_uk
  on public.stage_history (episodio_id) where saiu_em is null;

-- ---------------------------------------------------------------------------
-- Checklists versionados por etapa (snapshot: item marcado referencia a versão)
-- ---------------------------------------------------------------------------
create table if not exists public.checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid references public.pipeline_stages(id) on delete set null,
  nome        text not null,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.checklist_template_versions (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.checklist_templates(id) on delete cascade,
  versao        int not null,
  criada_em     timestamptz not null default now(),
  unique (template_id, versao)
);

create table if not exists public.checklist_items (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references public.checklist_template_versions(id) on delete cascade,
  label        text not null,
  ordem        int not null default 0,
  obrigatorio  boolean not null default true
);
create index if not exists checklist_items_version_idx on public.checklist_items (version_id);

create table if not exists public.episode_checklist_instances (
  id           uuid primary key default gen_random_uuid(),
  episodio_id  uuid not null references public.episodios(id) on delete cascade,
  stage_id     uuid not null references public.pipeline_stages(id) on delete cascade,
  version_id   uuid not null references public.checklist_template_versions(id),
  created_at   timestamptz not null default now(),
  unique (episodio_id, stage_id)
);

create table if not exists public.episode_checklist_checks (
  id            uuid primary key default gen_random_uuid(),
  instance_id   uuid not null references public.episode_checklist_instances(id) on delete cascade,
  item_id       uuid not null references public.checklist_items(id),
  concluido     boolean not null default false,
  concluido_em  timestamptz,
  unique (instance_id, item_id)
);

-- ---------------------------------------------------------------------------
-- import_presets — mapeamentos coluna→campo por fonte
-- ---------------------------------------------------------------------------
create table if not exists public.import_presets (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  tipo          text not null default 'custom' check (tipo in ('controle','at_membros','spotify','custom')),
  mapa_colunas  jsonb not null default '{}'::jsonb,
  chave_dedup   jsonb not null default '[]'::jsonb,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Triggers de updated_at + RLS padrão em todas as tabelas
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'settings','eixos_tematicos','pipeline_stages','pessoas','episodios',
    'episodio_pessoas','stage_history','checklist_templates',
    'checklist_template_versions','checklist_items','episode_checklist_instances',
    'episode_checklist_checks','import_presets'
  ];
begin
  foreach t in array tables loop
    perform public.apply_standard_policies(('public.'||t)::regclass);
  end loop;

  -- updated_at só nas tabelas que têm a coluna
  foreach t in array array[
    'settings','eixos_tematicos','pipeline_stages','pessoas','episodios',
    'checklist_templates','import_presets'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
