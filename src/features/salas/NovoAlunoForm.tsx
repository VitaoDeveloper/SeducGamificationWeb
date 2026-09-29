import { useState } from 'react'
import type { FormEvent } from 'react'
import { Alert, Button, Card, Field, Input } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { cadastrarAluno } from './salas.api'
import type { Aluno } from './salas.tipos'

export interface NovoAlunoFormProps {
  salaId: string
  /** Recebe o aluno criado, para a tela mostrar o código e recarregar a lista. */
  onCriado: (aluno: Aluno) => void
}

/**
 * Cadastro de aluno da sala.
 *
 * Só o nome: o código de matrícula e a senha inicial são gerados pela API
 * (padrão `26XXX`, sequencial por ano) e não há campo para digitá-los aqui. O
 * que o professor precisa, que é repassar o código ao aluno, aparece no modal
 * de confirmação assim que a chamada volta.
 *
 * O formulário fica aberto depois de cada cadastro, com o campo limpo. Uma
 * sala tem dezenas de alunos e a criação é de um em um, então ficar na mesma
 * tela é o que torna o trabalho possível sem recarregar a página a cada
 * aluno.
 */
export function NovoAlunoForm({ salaId, onCriado }: NovoAlunoFormProps) {
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    if (!nome.trim()) {
      setErro('Informe o nome do aluno.')
      setErroGeral(null)
      return
    }

    setErro(undefined)
    setErroGeral(null)
    setEnviando(true)

    try {
      const aluno = await cadastrarAluno(salaId, { nome: nome.trim() })
      setNome('')
      onCriado(aluno)
    } catch (falha) {
      setErroGeral(mensagemDeErro(falha, 'Não foi possível cadastrar o aluno. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card tone="accent" bar="left" className="max-w-xl">
      <h2 className="text-lg font-semibold">Novo aluno</h2>
      <p className="text-neutral-500 mt-1.5 text-sm">
        O código de matrícula é gerado automaticamente, e a senha inicial do
        aluno é esse mesmo código.
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-4">
        {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

        <Field label="Nome do aluno" error={erro} required>
          <Input
            name="nome"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            placeholder="Maria da Silva"
            disabled={enviando}
          />
        </Field>

        <Button type="submit" loading={enviando} loadingText="Cadastrando…">
          Cadastrar aluno
        </Button>
      </form>
    </Card>
  )
}
