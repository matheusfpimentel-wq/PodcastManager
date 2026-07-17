-- =============================================================================
-- Julgados e Comentados — Migration 0003: hardening de search_path
-- =============================================================================
-- Silencia o lint function_search_path_mutable. Todas as funções usam apenas
-- objetos de pg_catalog (implícito no path) ou public totalmente qualificado,
-- então search_path vazio é seguro e não altera a imutabilidade das funções de
-- full-text usadas em colunas geradas.
-- =============================================================================

alter function public.set_updated_at() set search_path = '';
alter function public.pt_tsv(text) set search_path = '';
alter function public.pessoa_tsv(text, text, text, text[], text) set search_path = '';
alter function public.apply_standard_policies(regclass) set search_path = '';
