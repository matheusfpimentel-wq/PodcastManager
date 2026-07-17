-- =============================================================================
-- Julgados e Comentados — Migration 0004: mover episódio de etapa (transacional)
-- =============================================================================
-- RPC que, ao mover um episódio para uma etapa:
--   1) fecha a etapa aberta em stage_history (saiu_em = now);
--   2) abre a nova em stage_history;
--   3) atualiza episodios.stage_id;
--   4) instancia o(s) checklist(s) ativo(s) da etapa (versão mais recente),
--      idempotente por (episodio, stage) — não recria se já existir.
-- Mover para a mesma etapa é no-op. security invoker + RLS => respeita usuário.
-- Observação: episode_checklist_instances é único por (episodio, stage), então
-- hoje suporta 1 checklist por etapa (o seed tem 1). Ampliar é aditivo.
-- =============================================================================

create or replace function public.move_episode_to_stage(p_episode uuid, p_stage uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_current uuid;
  v_tpl record;
  v_version uuid;
  v_instance uuid;
begin
  select stage_id into v_current from public.episodios where id = p_episode;

  -- no-op se já está na etapa alvo
  if v_current is not distinct from p_stage then
    return;
  end if;

  update public.stage_history
     set saiu_em = v_now
   where episodio_id = p_episode and saiu_em is null;

  insert into public.stage_history (episodio_id, stage_id, entrou_em)
  values (p_episode, p_stage, v_now);

  update public.episodios set stage_id = p_stage where id = p_episode;

  for v_tpl in
    select id from public.checklist_templates
     where stage_id = p_stage and ativo = true
  loop
    select id into v_version
      from public.checklist_template_versions
     where template_id = v_tpl.id
     order by versao desc
     limit 1;

    if v_version is null then
      continue;
    end if;

    if exists (
      select 1 from public.episode_checklist_instances
       where episodio_id = p_episode and stage_id = p_stage
    ) then
      continue;
    end if;

    insert into public.episode_checklist_instances (episodio_id, stage_id, version_id)
    values (p_episode, p_stage, v_version)
    returning id into v_instance;

    insert into public.episode_checklist_checks (instance_id, item_id, concluido)
    select v_instance, ci.id, false
      from public.checklist_items ci
     where ci.version_id = v_version;
  end loop;
end;
$$;
