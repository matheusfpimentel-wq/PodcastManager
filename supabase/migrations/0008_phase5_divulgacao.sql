-- =============================================================================
-- Julgados e Comentados — Migration 0008: divulgação por episódio (Fase 5, §6.7)
-- =============================================================================
-- 5 campos de texto do pacote real de divulgação + status por peça. O sistema
-- NÃO gera esses textos (redação acontece fora) — ele guarda, organiza e serve.
-- Uma linha por episódio. RLS authenticated-only (helper 0001).
-- =============================================================================

create table if not exists public.episode_promo (
  episodio_id   uuid primary key references public.episodios(id) on delete cascade,
  spotify       text not null default '',
  site_mppr     text not null default '',
  instagram     text not null default '',
  whatsapp      text not null default '',
  youtube       text not null default '',
  -- status por peça: { "spotify": "rascunho|pronto|publicado", ... }
  status        jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

do $$ begin
  perform public.apply_standard_policies('public.episode_promo'::regclass);
  drop trigger if exists set_updated_at on public.episode_promo;
  create trigger set_updated_at before update on public.episode_promo
    for each row execute function public.set_updated_at();
end $$;
