-- =============================================================================
-- Julgados e Comentados — Migration 0002: seed da Fase 1
-- =============================================================================
-- APENAS o formato atual como PONTO DE PARTIDA (não regra fixa). Tudo aqui é
-- editável pela UI. UUIDs fixos + ON CONFLICT DO NOTHING => reexecução idempotente
-- que NUNCA sobrescreve edições feitas pelo usuário.
--
-- Conteúdo que depende de você (texto dos Modelos 1–4, colunas reais do "Controle"
-- e do "AT MEMBROS", links institucionais) NÃO é inventado aqui: entra como
-- skeleton/valor vazio para você preencher pela interface.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- pipeline_stages (seed): Curadoria → Agendado → Roteirização → Gravado → Edição → Distribuído
-- ----------------------------------------------------------------------------
insert into public.pipeline_stages (id, nome, ordem, cor, exige_checklist_completo) values
  ('11111111-1111-1111-1111-000000000001'::uuid, 'Curadoria',     10, '#64748b', false),
  ('11111111-1111-1111-1111-000000000002'::uuid, 'Agendado',      20, '#0ea5e9', false),
  ('11111111-1111-1111-1111-000000000003'::uuid, 'Roteirização',  30, '#8b5cf6', false),
  ('11111111-1111-1111-1111-000000000004'::uuid, 'Gravado',       40, '#f59e0b', false),
  ('11111111-1111-1111-1111-000000000005'::uuid, 'Edição',        50, '#ef4444', false),
  ('11111111-1111-1111-1111-000000000006'::uuid, 'Distribuído',   60, '#22c55e', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Checklist da etapa Edição (versionado). Seed do §6.3 do brief.
-- ----------------------------------------------------------------------------
insert into public.checklist_templates (id, stage_id, nome) values
  ('22222222-2222-2222-2222-000000000001'::uuid,
   '11111111-1111-1111-1111-000000000005'::uuid, 'Checklist de Edição')
on conflict (id) do nothing;

insert into public.checklist_template_versions (id, template_id, versao) values
  ('22222222-2222-2222-2222-0000000000a1'::uuid,
   '22222222-2222-2222-2222-000000000001'::uuid, 1)
on conflict (id) do nothing;

insert into public.checklist_items (id, version_id, label, ordem, obrigatorio) values
  ('33333333-3333-3333-3333-000000000001'::uuid, '22222222-2222-2222-2222-0000000000a1'::uuid, 'Limpeza / decupagem', 10, true),
  ('33333333-3333-3333-3333-000000000002'::uuid, '22222222-2222-2222-2222-0000000000a1'::uuid, 'Redução de ruído', 20, true),
  ('33333333-3333-3333-3333-000000000003'::uuid, '22222222-2222-2222-2222-0000000000a1'::uuid, 'Nivelamento para −1 dB (compressão de banda única)', 30, true),
  ('33333333-3333-3333-3333-000000000004'::uuid, '22222222-2222-2222-2222-0000000000a1'::uuid, 'Polimento (hard limiter)', 40, true),
  ('33333333-3333-3333-3333-000000000005'::uuid, '22222222-2222-2222-2222-0000000000a1'::uuid, 'Exportação (MP3, 48.000 Hz, 320 kbps)', 50, true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- settings (defaults do §CLAUDE.md / brief). links_institucionais e host_default
-- ficam VAZIOS para você preencher pela UI (não invento links nem escolho pessoa).
-- ----------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('ppm',                       '150'::jsonb),
  ('duracao_alvo_min',          '50'::jsonb),
  ('regra_convidado_repetido',  '"alertar"'::jsonb),
  ('dias_parado_alerta',        '7'::jsonb),
  ('host_default_id',           'null'::jsonb),
  ('host_default_nome',         '"Fernanda Soares"'::jsonb),
  ('links_institucionais',      '{"spotify":"","site_mppr":"","youtube":"","form_autorizacao_imagem":""}'::jsonb)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- import_presets (skeletons). mapa_colunas fica vazio até você enviar os
-- cabeçalhos reais do "Controle" e do CSV do Spotify. "AT MEMBROS" é processado
-- SÓ no client (LGPD) — não há preset de persistência em massa para ele.
-- ----------------------------------------------------------------------------
insert into public.import_presets (id, nome, tipo, mapa_colunas, chave_dedup) values
  ('44444444-4444-4444-4444-000000000001'::uuid, 'Controle — Julgados e Comentados', 'controle', '{}'::jsonb, '["numero"]'::jsonb),
  ('44444444-4444-4444-4444-000000000002'::uuid, 'Spotify for Creators',              'spotify',  '{}'::jsonb, '["numero","data_referencia"]'::jsonb)
on conflict (id) do nothing;
