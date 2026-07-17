/**
 * Monta o contexto para renderTemplate a partir das entidades (spec §6.6).
 * Puro: recebe dados já carregados, não acessa persistência.
 */
import type { TemplateContext } from './renderTemplate'

export interface PessoaLike {
  nome?: string | null
  tratamento?: string | null
  cargo_atual?: string | null
  comarca_lotacao?: string | null
  email?: string | null
  telefone?: string | null
  instagram?: string | null
}

export interface EpisodioLike {
  numero?: number | null
  titulo?: string | null
  tema?: string | null
  data_gravacao?: string | null
  data_lancamento?: string | null
  links?: Record<string, unknown> | null
}

export interface BuildContextInput {
  pessoa?: PessoaLike | null
  episodio?: EpisodioLike | null
  /** Links institucionais padrão (settings). Episódio sobrescreve quando presente. */
  linksInstitucionais?: Record<string, unknown> | null
}

/** HH:mm da gravação no fuso de São Paulo (ou '' se não houver data). */
export function horaGravacao(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(d)
}

export function buildMessageContext(input: BuildContextInput): TemplateContext {
  const { pessoa, episodio, linksInstitucionais } = input
  const links = { ...(linksInstitucionais ?? {}), ...(episodio?.links ?? {}) }

  return {
    pessoa: {
      nome: pessoa?.nome ?? '',
      tratamento: pessoa?.tratamento ?? '',
      cargo: pessoa?.cargo_atual ?? '',
      comarca: pessoa?.comarca_lotacao ?? '',
      email: pessoa?.email ?? '',
      telefone: pessoa?.telefone ?? '',
      instagram: pessoa?.instagram ?? '',
    },
    episodio: {
      numero: episodio?.numero ?? '',
      titulo: episodio?.titulo ?? '',
      tema: episodio?.tema ?? '',
      data_gravacao: episodio?.data_gravacao ?? '',
      hora_gravacao: horaGravacao(episodio?.data_gravacao),
      data_lancamento: episodio?.data_lancamento ?? '',
    },
    links,
  }
}

/** Catálogo de variáveis para a UI do editor de modelos. */
export const AVAILABLE_VARS: Array<{ path: string; descricao: string }> = [
  { path: 'pessoa.tratamento', descricao: 'Tratamento (Dr., Dra., Promotor(a)…)' },
  { path: 'pessoa.nome', descricao: 'Nome do convidado' },
  { path: 'pessoa.cargo', descricao: 'Cargo atual' },
  { path: 'pessoa.comarca', descricao: 'Comarca/lotação' },
  { path: 'pessoa.email', descricao: 'E-mail' },
  { path: 'pessoa.telefone', descricao: 'Telefone' },
  { path: 'pessoa.instagram', descricao: 'Instagram' },
  { path: 'episodio.numero', descricao: 'Número do episódio' },
  { path: 'episodio.titulo', descricao: 'Título' },
  { path: 'episodio.tema', descricao: 'Tema' },
  { path: 'episodio.data_gravacao | extenso', descricao: 'Data de gravação por extenso' },
  { path: 'episodio.hora_gravacao', descricao: 'Hora da gravação' },
  { path: 'episodio.data_lancamento | extenso', descricao: 'Data de lançamento por extenso' },
  { path: 'links.spotify', descricao: 'Link do Spotify' },
  { path: 'links.site_mppr', descricao: 'Link do site MPPR' },
  { path: 'links.youtube', descricao: 'Link do YouTube' },
  { path: 'links.form_autorizacao_imagem', descricao: 'Formulário de autorização de imagem' },
]
