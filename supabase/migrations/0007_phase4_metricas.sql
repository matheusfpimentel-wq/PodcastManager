-- =============================================================================
-- Julgados e Comentados — Migration 0007: métricas (Fase 4)
-- =============================================================================
-- episode_metrics: SÉRIE TEMPORAL (não um número único) — plays por episódio,
-- plataforma e data de referência. metric_imports: cabeçalho de cada importação.
-- RLS authenticated-only (helper 0001).
-- =============================================================================

create table if not exists public.metric_imports (
  id           uuid primary key default gen_random_uuid(),
  preset_id    uuid references public.import_presets(id) on delete set null,
  arquivo_nome text,
  resumo       jsonb not null default '{}'::jsonb,
  importado_em timestamptz not null default now()
);

create table if not exists public.episode_metrics (
  id               uuid primary key default gen_random_uuid(),
  episodio_id      uuid not null references public.episodios(id) on delete cascade,
  plataforma       text not null default 'spotify',
  data_referencia  date not null,
  plays            int,
  outras           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  unique (episodio_id, plataforma, data_referencia)
);
create index if not exists episode_metrics_episodio_idx on public.episode_metrics (episodio_id);
create index if not exists episode_metrics_data_idx on public.episode_metrics (data_referencia);

do $$
declare t text;
begin
  foreach t in array array['metric_imports','episode_metrics'] loop
    perform public.apply_standard_policies(('public.'||t)::regclass);
  end loop;
end $$;
