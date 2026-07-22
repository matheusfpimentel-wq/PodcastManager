import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  deleteTranscricao,
  getTranscricao,
  saveTranscricao,
} from '@/data/repositories/transcricoes'
import { processTranscriptFile } from '@/domain/transcript/parse'

export function TranscricaoTab({ episodeId }: { episodeId: string }) {
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const trans = useQuery({
    queryKey: ['transcricao', episodeId],
    queryFn: () => getTranscricao(episodeId),
  })

  const [conteudo, setConteudo] = useState('')
  const [arquivoNome, setArquivoNome] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (trans.data) {
      setConteudo(trans.data.conteudo)
      setArquivoNome(trans.data.arquivo_nome)
    }
  }, [trans.data])

  const save = useMutation({
    mutationFn: () => saveTranscricao(episodeId, { conteudo, arquivo_nome: arquivoNome }),
    onSuccess: () => {
      setSavedAt(new Date().toLocaleTimeString('pt-BR'))
      qc.invalidateQueries({ queryKey: ['transcricao', episodeId] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Falha ao salvar'),
  })

  const excluir = useMutation({
    mutationFn: () => deleteTranscricao(episodeId),
    onSuccess: () => {
      setConteudo('')
      setArquivoNome(null)
      setSavedAt(null)
      qc.invalidateQueries({ queryKey: ['transcricao', episodeId] })
    },
  })

  async function onFile(file: File) {
    setErro(null)
    try {
      const raw = await file.text()
      setConteudo(processTranscriptFile(file.name, raw))
      setArquivoNome(file.name)
    } catch {
      setErro('Não foi possível ler o arquivo.')
    }
  }

  if (trans.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>

  const chars = conteudo.length
  const palavras = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".txt,.vtt,.srt,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          Carregar arquivo (.txt/.vtt/.srt)
        </Button>
        {arquivoNome && <Badge variant="secondary">{arquivoNome}</Badge>}
        <span className="text-xs text-muted-foreground">
          {palavras} palavra(s) · {chars} caractere(s)
        </span>
        <div className="ml-auto flex items-center gap-2">
          {save.isPending ? (
            <span className="text-xs text-muted-foreground">salvando…</span>
          ) : savedAt ? (
            <span className="text-xs text-muted-foreground">salvo {savedAt}</span>
          ) : null}
          {(trans.data?.conteudo || arquivoNome) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={excluir.isPending}
              onClick={() => {
                if (confirm('Excluir a transcrição deste episódio?')) excluir.mutate()
              }}
            >
              Excluir
            </Button>
          )}
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Arquivos de legenda (.vtt/.srt) têm marcações de tempo e índices removidos
        automaticamente. Também é possível colar o texto diretamente abaixo.
      </p>

      <Textarea
        className="min-h-[420px] font-mono text-xs"
        placeholder="Cole a transcrição aqui ou carregue um arquivo…"
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
      />

      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  )
}
