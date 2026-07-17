import type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

// Aliases convenientes para as entidades usadas na app.
export type Pessoa = Tables<'pessoas'>
export type PessoaInsert = TablesInsert<'pessoas'>
export type PessoaUpdate = TablesUpdate<'pessoas'>

export type Episodio = Tables<'episodios'>
export type EpisodioInsert = TablesInsert<'episodios'>
export type EpisodioUpdate = TablesUpdate<'episodios'>

export type EpisodioPessoa = Tables<'episodio_pessoas'>
export type EixoTematico = Tables<'eixos_tematicos'>
export type PipelineStage = Tables<'pipeline_stages'>
export type StageHistory = Tables<'stage_history'>
export type ImportPreset = Tables<'import_presets'>
export type SettingRow = Tables<'settings'>

export type GeneroPessoa = Enums<'genero_pessoa'>
export type PapelEpisodio = 'convidado' | 'host' | 'participacao_especial' | 'cogitado'

export const GENEROS: readonly GeneroPessoa[] = [
  'feminino',
  'masculino',
  'outro',
  'nao_informado',
] as const

export const GENERO_LABEL: Record<GeneroPessoa, string> = {
  feminino: 'Feminino',
  masculino: 'Masculino',
  outro: 'Outro',
  nao_informado: 'Não informado',
}
