-- =============================================================================
-- Julgados e Comentados — Migration 0005: roteiro versionado + citações (Fase 2)
-- =============================================================================
-- script_templates + script_template_versions (estrutura JSON imutável por uso),
-- episode_scripts (conteúdo referenciando a versão exata), revisões, e citacoes.
-- RLS authenticated-only (helper da 0001). Seed: template "formato atual" v1.
-- =============================================================================

create table if not exists public.script_templates (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  descricao   text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.script_template_versions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.script_templates(id) on delete cascade,
  versao       int not null,
  estrutura    jsonb not null,
  criada_em    timestamptz not null default now(),
  unique (template_id, versao)
);

create table if not exists public.episode_scripts (
  id                   uuid primary key default gen_random_uuid(),
  episodio_id          uuid not null references public.episodios(id) on delete cascade,
  template_version_id  uuid not null references public.script_template_versions(id),
  conteudo             jsonb not null default '{}'::jsonb,
  atualizado_em        timestamptz not null default now(),
  unique (episodio_id)
);

create table if not exists public.episode_script_revisions (
  id                uuid primary key default gen_random_uuid(),
  episode_script_id uuid not null references public.episode_scripts(id) on delete cascade,
  conteudo          jsonb not null,
  criada_em         timestamptz not null default now()
);
create index if not exists episode_script_revisions_script_idx
  on public.episode_script_revisions (episode_script_id, criada_em desc);

create table if not exists public.citacoes (
  id                  uuid primary key default gen_random_uuid(),
  episodio_id         uuid not null references public.episodios(id) on delete cascade,
  tipo                text,
  identificador       text,
  orgao               text,
  data                date,
  o_que_fixou         text,
  fonte_url           text,
  status_verificacao  text not null default 'a_confirmar'
                        check (status_verificacao in ('verificado','a_confirmar')),
  search_tsv          tsvector generated always as (
    public.pt_tsv(
      coalesce(tipo,'') || ' ' || coalesce(identificador,'') || ' ' ||
      coalesce(orgao,'') || ' ' || coalesce(o_que_fixou,''))
  ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists citacoes_episodio_idx on public.citacoes (episodio_id);
create index if not exists citacoes_search_idx on public.citacoes using gin (search_tsv);
create index if not exists citacoes_status_idx on public.citacoes (status_verificacao);

-- RLS + updated_at
do $$
declare t text;
begin
  foreach t in array array[
    'script_templates','script_template_versions','episode_scripts',
    'episode_script_revisions','citacoes'
  ] loop
    perform public.apply_standard_policies(('public.'||t)::regclass);
  end loop;

  foreach t in array array['script_templates','citacoes'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: template "formato atual" (v1). Ponto de partida — editável pela UI,
-- cada edição gera nova versão (episódios antigos preservam a sua).
-- ---------------------------------------------------------------------------
insert into public.script_templates (id, nome, descricao) values
  ('55555555-5555-5555-5555-000000000001'::uuid, 'Formato atual', 'Estrutura padrão do Julgados e Comentados')
on conflict (id) do nothing;

insert into public.script_template_versions (id, template_id, versao, estrutura) values
  ('55555555-5555-5555-5555-0000000000a1'::uuid,
   '55555555-5555-5555-5555-000000000001'::uuid, 1,
   $json$
   {
     "sections": [
       { "id": "cold_open", "type": "texto", "label": "Cold Open" },
       { "id": "vinheta", "type": "marcador", "label": "Vinheta" },
       { "id": "abertura", "type": "texto", "label": "Abertura" },
       { "id": "contexto_b1", "type": "texto", "label": "Contextualização do Bloco 1", "duracaoAlvoSeg": 30 },
       { "id": "bloco1", "type": "bloco_de_perguntas", "label": "Bloco 1",
         "perguntasPadrao": 3,
         "subcampos": [
           { "key": "contexto", "label": "Contexto breve" },
           { "key": "pergunta", "label": "Pergunta aberta" },
           { "key": "debate", "label": "Três pontos de debate" }
         ],
         "camposOpcionais": [ { "key": "olhar_mp", "label": "Olhar do MP" } ] },
       { "id": "spot_esmp", "type": "marcador", "label": "Spot ESMP" },
       { "id": "recapitulacao", "type": "texto", "label": "Recapitulação" },
       { "id": "contexto_b2", "type": "texto", "label": "Contextualização do Bloco 2" },
       { "id": "bloco2", "type": "bloco_de_perguntas", "label": "Bloco 2",
         "perguntasPadrao": 3,
         "subcampos": [
           { "key": "contexto", "label": "Contexto breve" },
           { "key": "pergunta", "label": "Pergunta aberta" },
           { "key": "debate", "label": "Três pontos de debate" }
         ],
         "camposOpcionais": [ { "key": "olhar_mp", "label": "Olhar do MP" } ] },
       { "id": "takeaways", "type": "texto", "label": "Takeaways" },
       { "id": "encerramento", "type": "texto", "label": "Encerramento" }
     ]
   }
   $json$::jsonb)
on conflict (id) do nothing;
