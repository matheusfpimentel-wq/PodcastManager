# CLAUDE.md — Julgados e Comentados (Produção)

Sistema web full-stack, **usuário único**, para gerenciar a produção do podcast
jurídico *Julgados e Comentados* (ESMP-PR/MPPR): curadoria, CRM de convidados,
roteirização, comunicação, edição e distribuição. Substitui as planilhas de
controle atuais.

**Critério de valor** (usar em toda decisão de design): o produto existe para
**economizar tempo do produtor** e **organizar informação para reuso**. Se uma
funcionalidade não faz uma dessas duas coisas, ela é secundária.

---

## Princípio arquitetural nº 1 — o formato do programa é CONFIGURAÇÃO, não código

O formato editorial (estrutura do roteiro, etapas do fluxo, checklists, modelos
de mensagem, taxonomias, campos extras) **muda com o tempo** e é **dado editável
pela UI**, nunca hardcoded.

- Nada que descreva o formato editorial pode virar constante em componente.
- O formato atual entra apenas como **seed data** — ponto de partida, não regra fixa.
- **Versionamento com snapshot:** editar um template de roteiro/checklist cria uma
  **nova versão**. Episódios existentes preservam a versão com que foram criados e
  **nunca quebram retroativamente**.
- Regra de ouro: qualquer mudança de formato (nº de blocos/perguntas, etapas,
  modelos, checklist) é feita **pela interface, sem tocar em código e sem deploy**.

Critérios de aceite da flexibilidade (§10 do brief) — validar antes de "pronto":
adicionar etapa "Revisão" e reordenar; Bloco 1 com 4 perguntas em novo template
(antigos ficam com 3); criar "Modelo 5" com variáveis e lembrete próprios; editar
checklist da Edição; criar eixo temático novo e vê-lo em filtros/dashboard;
renomear rótulo de seção do roteiro em nova versão.

## Princípio arquitetural nº 2 — domínio desacoplado da persistência

A lógica de negócio (renderização de mensagens, parser Markdown↔template,
mapeamento/dedup de import, estimativa de tempo de fala, regras de versão) vive em
`src/domain/**` como **funções puras, sem React e sem Supabase**. Só a camada
`src/data/**` (repositórios) conhece o Supabase. Motivo: permitir migração futura
para Tauri + SQLite sem reescrever regras de negócio.

- ❌ `src/domain/**` nunca importa `@/lib/supabase` nem componentes React.
- ✅ Toda regra testável mora no domínio e tem teste unitário.

## Princípio arquitetural nº 3 — privacidade por design (LGPD)

Dados pessoais de membros do MP são tratados como requisito, não sugestão.

- **A base "AT MEMBROS" não sobe para a nuvem.** É carregada e processada **no
  client** (PapaParse/SheetJS → IndexedDB) apenas para busca/autocomplete. Só as
  pessoas **efetivamente vinculadas** a um episódio são persistidas no Supabase.
  Botão "Atualizar base" recarrega o arquivo quando houver versão nova.
- Telefones e e-mails **nunca** aparecem em logs de aplicação ou mensagens de erro.
- Exportação de dados pessoais só por **ação explícita** do usuário.
- "Excluir pessoa" oferece **anonimizar participações antigas** preservando
  métricas agregadas.
- **RLS ativo em todas as tabelas**, mesmo sendo usuário único.
- `.gitignore` bloqueia arquivos `*at-membros*` e `data/private/` — nunca commitar
  planilhas de membros.

---

## Stack

| Camada        | Escolha |
|---------------|---------|
| Frontend      | Vite + React 18 + TypeScript (**strict**, sem `any` implícito) |
| Dados/Auth    | Supabase (Postgres, Auth e-mail/senha, **RLS em tudo**) |
| Deploy        | Vercel |
| UI            | Tailwind + primitivos estilo shadcn; `dnd-kit` (Kanban); Recharts (gráficos) |
| Parsing       | PapaParse (CSV) + SheetJS/xlsx (XLSX), **no client** |
| Estado/dados  | React Query (server state) + Zustand (UI state pontual) |
| PWA           | Instalável e responsiva (manifest em `public/`) — sem app nativo |
| Testes        | Vitest + Testing Library |

---

## Estrutura de pastas

```
src/
  domain/          # regras puras, sem React/Supabase (testadas)
    messages/      # renderTemplate: variáveis {{...}} + filtros + "missing"
    script/        # (fase 2) Markdown <-> template versionado
    import/        # (fase 1) mapeamento coluna→campo + dedup
    metrics/       # (fase 4) motor métrica × dimensão × período
  data/            # (a criar) repositórios Supabase — ÚNICO lugar que importa @/lib/supabase
  lib/             # supabase client, utils (cn)
  components/      # (a criar) UI (primitivos shadcn + compostos)
  routes/ | pages/ # (a criar) telas por módulo
  test/            # setup do Vitest
docs/
  schema-proposal.md   # proposta de schema — APROVAR antes de qualquer migration
```

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # tsc -b && vite build
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run lint       # eslint
```

## Configuração

Copie `.env.example` → `.env.local` e preencha `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API). Sem isso, features
de nuvem ficam desabilitadas (`isSupabaseConfigured()`), mas o domínio e os testes
rodam normalmente.

---

## Testes mínimos obrigatórios (§9 do brief)

1. Renderização de variáveis de mensagem, **incluindo variável ausente** ✅ (`renderTemplate.test.ts`)
2. Parser Markdown↔template do roteiro (**round-trip**) — fase 2
3. Mapeamento e **deduplicação** de import — fase 1
4. **Imutabilidade** de versões de template frente a edições — fase 2

## Fases de entrega (cada fase termina utilizável)

0. **Fundação (atual):** scaffold, toolchain, domínio de mensagens, CLAUDE.md,
   proposta de schema. Sem migrations ainda.
1. **Fundação de dados:** schema aprovado + migrations + seed, auth, CRM de
   pessoas, importador com presets, Kanban básico com checklists.
2. **Roteiro:** templates versionados, editor, citações, import/export Markdown,
   PDF, modo gravação.
3. **Comunicação:** modelos, geração em um clique, log, lembretes, tela "Hoje".
4. **Métricas:** imports de analytics, motor métrica × dimensão, widgets seed,
   exports CSV/PDF, relatório executivo.
5. **Extras:** divulgação por episódio, cofre (se mantido), polimento, PWA.

## Processo (§9 do brief) — seguir à risca

- **Antes de qualquer migration**, obter do usuário: (a) CSV real "Controle —
  Julgados e Comentados"; (b) colunas do "AT MEMBROS"; (c) texto integral dos
  Modelos 1–4; (d) links institucionais padrão. **Não inventar** colunas nem
  conteúdo de modelo.
- **Propor o schema em texto e aguardar aprovação** antes de migrar
  (`docs/schema-proposal.md`).
- Migrations idempotentes e versionadas; commits pequenos por lote coeso.
- Ao concluir cada fase, entregar **instruções de teste manual**.

## Fora de escopo v1

Edição/processamento de áudio; publicação automática nas plataformas (APIs
Spotify/YouTube); multiusuário/permissões; app nativo; geração de texto por IA.

## Mapa de seed data (a popular após aprovação do schema)

- **pipeline_stages:** Curadoria → Agendado → Roteirização → Gravado → Edição → Distribuído.
- **checklist (Edição):** Limpeza/decupagem; Redução de ruído; Nivelamento −1 dB
  (compressão banda única); Polimento (hard limiter); Exportação (MP3, 48 kHz, 320 kbps).
- **script_template (formato atual):** Cold Open → Vinheta [marcador] → Abertura →
  Contextualização Bloco 1 (~30s) → Bloco 1 (3 perguntas padrão) → Spot ESMP
  [marcador] → Recapitulação → Contextualização Bloco 2 → Bloco 2 (3 perguntas,
  expansível "P4 em diante") → Takeaways → Encerramento. Subcampos de pergunta:
  Contexto breve, Pergunta aberta, Três pontos de debate. Opcional por bloco: "Olhar do MP".
- **message_templates:** 1 Convite, 2 Briefing (D−1), 3 Materiais (D0/D+1),
  4 Lançamento — **texto integral a ser fornecido pelo usuário**.
- **settings:** palavras-por-minuto = 150 (default), duração-alvo = 50 min,
  host default = Fernanda Soares, regra de convidado repetido = alertar (não bloquear).
