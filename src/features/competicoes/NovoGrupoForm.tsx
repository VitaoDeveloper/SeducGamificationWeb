import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Field, Input } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { criarGrupo } from './competicoes.api'
import type { GrupoCompetidor } from './competicoes.tipos'

export interface NovoGrupoFormProps {
  competicaoId: string
  /** Chamado com o grupo criado, para a tela recarregar a lista. */
  onCriado: (grupo: GrupoCompetidor) => void
}

/**
 * Criação de um grupo dentro da competição.
 *
 * O grupo é uma equipe que atravessa o ano: criado uma vez, ele recebe
 * integrantes por bimestre. Por isso aqui só se pede o nome — quem entra no
 * grupo é assunto do gerenciador de membros, logo abaixo.
 */
export function NovoGrupoForm({ competicaoId, onCriado }: NovoGrupoFormProps) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    if (!nome.trim()) {
      setErro('Informe o nome do grupo.')
      return
    }

    setErro(null)
    setEnviando(true)
    try {
      const grupo = await criarGrupo(competicaoId, nome.trim())
      setNome('')
      onCriado(grupo)
    } catch (falha) {
      setErro(mensagemDeErro(falha, 'Não foi possível criar o grupo. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-wrap items-end gap-3">
      {erro ? (
        <div className="w-full">
          <Alert tone="erro">{erro}</Alert>
        </div>
      ) : null}

      <Field label="Nome do grupo" className="min-w-56 flex-1">
        <Input
          name="nome-do-grupo"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Equipe Alpha"
          disabled={enviando}
        />
      </Field>

      <Button type="submit" variant="secondary" loading={enviando} loadingText="Criando…">
        Criar grupo
      </Button>
    </form>
  )
}
