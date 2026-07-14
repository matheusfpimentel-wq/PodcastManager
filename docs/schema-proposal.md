# Proposta de schema — Julgados e Comentados

> **Status: PROPOSTA. Aguardando aprovação.** Nenhuma migration será criada até
> você aprovar este documento e fornecer os dados reais (§9 do brief): o CSV
> "Controle — Julgados e Comentados", as colunas do "AT MEMBROS", o texto dos
> Modelos 1–4 e os links institucionais padrão.
>
> Notação: `PK` chave primária, `FK` chave estrangeira, `JSONB` para campos
> extensíveis, `TSV` coluna de full-text search. Todas as tabelas terão **RLS
> ativo** e colunas `created_at` / `updated_at`.

## Convenções globais

- **Config, não código:** taxonomias, etapas, templates, checklists e modelos são
  linhas nestas tabelas — editáveis pela UI, nunca hardcoded.
- **Versionamento com snapshot:** roteiros e checklists usam tabela-mãe +
  tabela-de-versões; o episódio referencia a **versão exata**, então edições
  futuras nunca alteram episódios antigos.
- **Campos extras:** entidades-chave têm `campos_extras JSONB` para novos campos
  definidos pelo usuário sem migration.
- **Usuário único:** RLS restringe tudo ao dono autenticado (coluna `owner_id`
  default `auth.uid()` — confirmar se prefere assim ou RLS "authenticated-only").

---

## 1. Pessoas e taxonomias

### `pessoas`
CRM. Só entram aqui pessoas **vinculadas a um episódio** (convidado ou cogitado em
curadoria) — a base AT MEMBROS completa **não** é persistida (fica no client).

| coluna | tipo | notas |
|---|---|---|
| id | PK uuid | |
| nome | text | obrigatório |
| tratamento | text | "Dr.", "Dra.", "Promotor(a)"… (para mensagens) |
| cargo_atual | text | |
| comarca_lotacao | text | |
| email | text | dado sensível — nunca em logs |
| telefone | text | dado sensível — nunca em logs |
| instagram | text | |
| genero | text | para métrica de paridade; **editável**, enum leve (`feminino`/`masculino`/`outro`/`nao_informado`) |
| origem | text | `at_membros` \| `manual` |
| tags | text[] | busca/curadoria |
| notas | text | |
| campos_extras | JSONB | campos definidos pelo usuário |
| anonimizada | bool | true após "excluir preservando métricas" |
| search_tsv | TSV | full-text (nome, cargo, comarca, tags, notas) |

> **Pergunta:** manter `genero` como enum leve ou texto livre? Proponho enum leve
> com opção "não informado" para não travar a métrica.

### `eixos_tematicos`
CRUD pelo usuário. `id`, `nome`, `descricao`, `cor`, `ordem`, `ativo`.

> Demais taxonomias (ex.: `tipos_citacao`, se você quiser controlá-los) seguem o
> mesmo padrão. Por ora deixo `citacoes.tipo` como texto com sugestões na UI —
> confirmar se prefere tabela dedicada.

---

## 2. Episódios e pipeline

### `episodios`
| coluna | tipo | notas |
|---|---|---|
| id | PK uuid | |
| numero | int | nº do episódio (chave natural p/ dedup do import "Controle") |
| titulo | text | |
| tema | text | |
| eixo_id | FK → eixos_tematicos | |
| host_id | FK → pessoas | default: Fernanda Soares (via settings), editável |
| data_gravacao | timestamptz | alimenta lembretes (D−1, D0…) |
| data_lancamento | date | |
| duracao_seg | int | duração real |
| stage_id | FK → pipeline_stages | etapa atual |
| links | JSONB | `{ spotify, site_mppr, youtube, ... }` — extensível |
| notas | text | |
| campos_extras | JSONB | |
| search_tsv | TSV | (titulo, tema) |

### `episodio_pessoas` (N:N com papel)
`episodio_id` FK, `pessoa_id` FK, `papel` (`convidado`\|`host`\|`participacao_especial`\|`cogitado`),
`ordem`. PK composta `(episodio_id, pessoa_id, papel)`.

> `cogitado` cobre a curadoria (pessoa considerada antes de confirmar convite).

### `pipeline_stages`
Etapas do Kanban, **CRUD e reordenáveis**. `id`, `nome`, `ordem`, `cor`,
`exige_checklist_completo` (bool), `ativo`.
Seed: Curadoria → Agendado → Roteirização → Gravado → Edição → Distribuído.

### `stage_history`
Trilha para métricas de tempo de produção. `id`, `episodio_id` FK, `stage_id` FK,
`entrou_em` timestamptz, `saiu_em` timestamptz (null = atual).

---

## 3. Roteiro (versionado)

### `script_templates`
`id`, `nome`, `descricao`, `ativo`. A tabela-mãe; o conteúdo estrutural vive nas versões.

### `script_template_versions`
`id`, `template_id` FK, `versao` int, `estrutura` JSONB (**imutável** após uso),
`criada_em`. `estrutura` = lista ordenada de seções tipadas:
- `marcador` — ponto fixo sem texto (Vinheta, Spot ESMP);
- `texto` — texto rico simples (Cold Open, Abertura, Recapitulação, Takeaways…);
- `bloco_de_perguntas` — grupo repetível; **subcampos definidos no template**
  (ex.: Contexto breve, Pergunta aberta, Três pontos de debate), com
  `min`/`padrao` de perguntas e campos opcionais (ex.: "Olhar do MP").

> Regra de imutabilidade: salvar edição de um template **insere nova versão**;
> nunca faz UPDATE numa versão já referenciada por episódio. (Teste obrigatório.)

### `episode_scripts`
Conteúdo por episódio. `id`, `episodio_id` FK, `template_version_id` FK (a versão
exata usada), `conteudo` JSONB (valores por seção/pergunta), `atualizado_em`.
Autosave + histórico simples de revisões (tabela `episode_script_revisions` ou
coluna de histórico — proponho tabela leve de revisões).

### `citacoes`
Registro pesquisável de cada lei/julgado/tema/súmula/dado citado.
`id`, `episodio_id` FK, `tipo` (REsp, HC, RE, Tema, Súmula, Lei, PL, dado…),
`identificador` (número), `orgao`, `data`, `o_que_fixou` text, `fonte_url`,
`status_verificacao` (`verificado`\|`a_confirmar`), `search_tsv`.
Qualquer `a_confirmar` → aviso no card e no editor.

---

## 4. Checklists (versionados por etapa)

### `checklist_templates`
`id`, `stage_id` FK, `nome`, `ativo`. Uma etapa pode ter seu checklist.

### `checklist_template_versions` + `checklist_items`
Versões imutáveis; `checklist_items`: `id`, `version_id` FK, `label`, `ordem`,
`obrigatorio` bool. (Mesma lógica de snapshot do roteiro.)
Seed (Edição): Limpeza/decupagem; Redução de ruído; Nivelamento −1 dB (compressão
banda única); Polimento (hard limiter); Exportação (MP3, 48 kHz, 320 kbps).

### `episode_checklist_instances` + `episode_checklist_checks`
Instância por episódio+etapa referenciando a versão; itens marcados com
`concluido` bool + `concluido_em`.

---

## 5. Comunicação

### `message_templates`
`id`, `nome`, `canal` (`whatsapp`\|`email`\|`generico`), `assunto` (e-mail),
`corpo` text (com variáveis `{{...}}`), `regra_lembrete` JSONB
(ex.: `{ base: "data_gravacao", offset_dias: -1 }`), `ativo`.
Seed: 1 Convite, 2 Briefing (D−1), 3 Materiais (D0/D+1), 4 Lançamento —
**texto integral fornecido por você**.

### `communication_log`
`id`, `pessoa_id` FK, `episodio_id` FK, `template_id` FK, `canal`, `enviado_em`,
`conteudo_renderizado` text. Alimenta o histórico do CRM.

---

## 6. Métricas e tarefas

### `metric_imports`
Cabeçalho de cada importação de analytics. `id`, `preset_id` FK, `arquivo_nome`,
`importado_em`, `resumo` JSONB (criados/atualizados/ignorados).

### `episode_metrics` (série temporal — não um número único)
`id`, `episodio_id` FK, `plataforma` (`spotify`\|…), `data_referencia` date,
`plays` int, `outras` JSONB. Único por `(episodio_id, plataforma, data_referencia)`
→ reimport idempotente.

### `tasks`
Pendências/lembretes datados. `id`, `titulo`, `descricao`, `vence_em`,
`episodio_id` FK null, `pessoa_id` FK null, `origem` (`manual`\|`lembrete_stage`\|`lembrete_mensagem`),
`concluida` bool. Alimenta a tela "Hoje".

---

## 7. Importação, divulgação, settings, cofre

### `import_presets`
Mapeamentos salvos por fonte. `id`, `nome`, `tipo` (`controle`\|`at_membros`\|`spotify`\|`custom`),
`mapa_colunas` JSONB (coluna→campo), `chave_dedup` JSONB, `ativo`.
Seed: "Controle — Julgados e Comentados", "Spotify for Creators".
(AT MEMBROS é preset **client-side** — não persiste dados de pessoas em massa.)

### `episode_promo` (divulgação por episódio)
5 campos de texto: `spotify_desc`, `site_mppr`, `instagram`, `whatsapp`, `youtube`,
mais `status` por peça (`rascunho`\|`pronto`\|`publicado`). `episodio_id` FK único.

### `settings`
Chave-valor global. `ppm` (default 150), `duracao_alvo_min` (50), `host_default_id`,
`regra_convidado_repetido` (`alertar`\|`bloquear`, default `alertar`),
`dias_parado_alerta` (N), `links_institucionais` JSONB, `definicao_campos_extras` JSONB.

### ~~`vault_items` — cofre de credenciais~~ *(FORA da v1 — decidido)*
**Decisão:** o cofre **não** entra na v1; usar um gerenciador dedicado
(Bitwarden/1Password). Fácil de acrescentar depois, sem impacto no restante do schema.

---

## Decisões que preciso confirmar com você

1. ~~**Supabase:** projeto novo vs. existente.~~ ✅ **Decidido: projeto novo dedicado.**
   Será criado como primeiro passo da Fase 1 (após aprovação do schema + arquivos).
2. ~~**Cofre de credenciais.**~~ ✅ **Decidido: fora da v1.**
3. **`genero`** em `pessoas`: enum leve com "não informado" (proposto) ou texto livre?
4. **`citacoes.tipo`**: texto com sugestões (proposto) ou tabela de taxonomia dedicada?
5. **RLS:** `owner_id = auth.uid()` por linha (proposto) ou simplesmente
   "authenticated-only" já que é usuário único?
6. Algum campo do "Controle" ou do "AT MEMBROS" que **não** aparece acima e você
   quer preservar? (Verei ao receber os arquivos.)
