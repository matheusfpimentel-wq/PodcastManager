-- =============================================================================
-- Julgados e Comentados — Migration 0006: comunicação (Fase 3)
-- =============================================================================
-- message_templates (variáveis {{...}} + regra de lembrete), communication_log
-- e tasks (pendências/lembretes datados). RLS authenticated-only (helper 0001).
-- Seed: Modelos 1–4 como SKELETON — o texto oficial é colado pelo usuário.
-- =============================================================================

create table if not exists public.message_templates (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  canal           text not null default 'whatsapp' check (canal in ('whatsapp','email','generico')),
  assunto         text,
  corpo           text not null default '',
  regra_lembrete  jsonb,               -- ex.: { "base": "data_gravacao", "offset_dias": -1 }
  ordem           int not null default 0,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.communication_log (
  id                    uuid primary key default gen_random_uuid(),
  pessoa_id             uuid references public.pessoas(id) on delete set null,
  episodio_id           uuid references public.episodios(id) on delete set null,
  template_id           uuid references public.message_templates(id) on delete set null,
  canal                 text,
  assunto               text,
  conteudo_renderizado  text,
  enviado_em            timestamptz not null default now()
);
create index if not exists communication_log_pessoa_idx on public.communication_log (pessoa_id, enviado_em desc);
create index if not exists communication_log_episodio_idx on public.communication_log (episodio_id, enviado_em desc);

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descricao    text,
  vence_em     timestamptz,
  episodio_id  uuid references public.episodios(id) on delete cascade,
  pessoa_id    uuid references public.pessoas(id) on delete set null,
  template_id  uuid references public.message_templates(id) on delete set null,
  origem       text not null default 'manual' check (origem in ('manual','lembrete_mensagem','lembrete_stage')),
  concluida    boolean not null default false,
  concluida_em timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tasks_vence_idx on public.tasks (vence_em) where concluida = false;

-- RLS + updated_at
do $$
declare t text;
begin
  foreach t in array array['message_templates','communication_log','tasks'] loop
    perform public.apply_standard_policies(('public.'||t)::regclass);
  end loop;
  foreach t in array array['message_templates','tasks'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Seed: Modelos 1–4 (SKELETON). Corpo com [TEXTO OFICIAL A DEFINIR] + variáveis.
-- O usuário cola o texto real pela UI; a regra de lembrete já vem configurada.
-- ---------------------------------------------------------------------------
insert into public.message_templates (id, nome, canal, ordem, regra_lembrete, corpo) values
  ('66666666-6666-6666-6666-000000000001'::uuid, '1 · Convite', 'whatsapp', 10, null,
   E'Olá, {{pessoa.tratamento}} {{pessoa.nome}}!\n\n[TEXTO OFICIAL DO CONVITE A DEFINIR — público do sistema de justiça, duração de ~50 min, gravação online]\n\nTema: {{episodio.tema}}'),
  ('66666666-6666-6666-6666-000000000002'::uuid, '2 · Briefing (D−1)', 'whatsapp', 20,
   '{"base":"data_gravacao","offset_dias":-1}'::jsonb,
   E'{{pessoa.tratamento}} {{pessoa.nome}}, nossa gravação é em {{episodio.data_gravacao | extenso}}.\n\n[TEXTO OFICIAL DO BRIEFING A DEFINIR — fone de ouvido, pausar em caso de erro]\n\nAutorização de imagem: {{links.form_autorizacao_imagem}}'),
  ('66666666-6666-6666-6666-000000000003'::uuid, '3 · Materiais (D0/D+1)', 'whatsapp', 30,
   '{"base":"data_gravacao","offset_dias":1}'::jsonb,
   E'{{pessoa.nome}}, obrigado pela participação!\n\n[TEXTO A DEFINIR — solicitar foto e @ do Instagram]'),
  ('66666666-6666-6666-6666-000000000004'::uuid, '4 · Lançamento', 'whatsapp', 40,
   '{"base":"data_lancamento","offset_dias":0}'::jsonb,
   E'No ar: {{episodio.tema}}\n\nSpotify: {{links.spotify}}\nSite MPPR: {{links.site_mppr}}\nYouTube: {{links.youtube}}\n\n[TEXTO A DEFINIR]')
on conflict (id) do nothing;
