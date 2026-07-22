-- =============================================================================
-- Julgados e Comentados — Migration 0009: transcrição do episódio (Fase 5)
-- =============================================================================
-- Guarda a transcrição de cada episódio (texto, colado ou extraído de arquivo
-- .txt/.vtt/.srt no client). Uma linha por episódio. O nome do arquivo original
-- é mantido só como referência. RLS authenticated-only (helper 0001).
-- =============================================================================

create table if not exists public.episode_transcricao (
  episodio_id   uuid primary key references public.episodios(id) on delete cascade,
  conteudo      text not null default '',
  arquivo_nome  text,
  updated_at    timestamptz not null default now()
);

do $$ begin
  perform public.apply_standard_policies('public.episode_transcricao'::regclass);
  drop trigger if exists set_updated_at on public.episode_transcricao;
  create trigger set_updated_at before update on public.episode_transcricao
    for each row execute function public.set_updated_at();
end $$;
