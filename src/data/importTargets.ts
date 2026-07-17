import type { TargetField } from '@/domain/import/coerce'

/**
 * Campos-alvo por tipo de preset. Espelham colunas do banco (estrutura, não
 * formato editorial). O usuário mapeia as colunas da planilha para estes campos.
 */
export const TARGET_FIELDS: Record<string, TargetField[]> = {
  controle: [
    { key: 'numero', label: 'Número do episódio', type: 'int' },
    { key: 'titulo', label: 'Título' },
    { key: 'tema', label: 'Tema' },
    { key: 'data_gravacao', label: 'Data de gravação', type: 'timestamp' },
    { key: 'data_lancamento', label: 'Data de lançamento', type: 'date' },
    { key: 'duracao_seg', label: 'Duração (segundos)', type: 'int' },
    { key: 'notas', label: 'Notas' },
  ],
  spotify: [
    { key: 'numero', label: 'Número do episódio', type: 'int' },
    { key: 'data_referencia', label: 'Data de referência', type: 'date' },
    { key: 'plays', label: 'Plays / Streams', type: 'int' },
  ],
  // 'at_membros' (client-side/LGPD) fora de escopo (decisão AT MEMBROS).
}

/** Tipos cujo "aplicar" já está implementado (upsert no banco). */
export const APPLY_SUPPORTED = new Set(['controle', 'spotify'])
