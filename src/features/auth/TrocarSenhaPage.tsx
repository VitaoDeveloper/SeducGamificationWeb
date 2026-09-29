import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Card, Field, Input, PageHeader } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { trocarSenha } from './auth.api'

interface ErrosDoFormulario {
  senhaAtual?: string
  novaSenha?: string
  confirmacao?: string
}

/**
 * Troca de senha, em `/conta/senha`.
 *
 * Entra junto com o login porque a senha inicial de todo mundo é o próprio
 * código de matrícula, então quase todo primeiro acesso termina aqui. Vale para
 * os dois perfis: a API escolhe a tabela pelo token e a tela é a mesma.
 */
export function TrocarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [confirmado, setConfirmado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function limparCampos() {
    setSenhaAtual('')
    setNovaSenha('')
    setConfirmacao('')
    setErros({})
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const novosErros: ErrosDoFormulario = {}
    if (!senhaAtual) {
      novosErros.senhaAtual = 'Informe a senha atual.'
    }
    if (!novaSenha) {
      novosErros.novaSenha = 'Informe a nova senha.'
    }
    if (!confirmacao) {
      novosErros.confirmacao = 'Repita a nova senha.'
    } else if (novaSenha !== confirmacao) {
      // Conferido aqui para não gastar uma ida ao servidor com o resultado
      // óbvio de dois campos que não batem.
      novosErros.confirmacao = 'As senhas não são iguais.'
    }

    setErros(novosErros)
    setErroGeral(null)
    setConfirmado(false)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      await trocarSenha(senhaAtual, novaSenha)
      limparCampos()
      setConfirmado(true)
    } catch (erro) {
      // 401 aqui é "senha atual incorreta", e não sessão expirada: a chamada
      // está marcada para não derrubar a sessão. A pessoa continua logada e
      // consegue corrigir o campo sem perder o trabalho.
      setErroGeral(mensagemDeErro(erro, 'Não foi possível trocar a senha. Tente de novo.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Trocar senha"
        description="A senha inicial é o código de matrícula. Trocar logo no primeiro acesso evita que qualquer pessoa da sala entre com a senha de outra pessoa."
      />

      <Card tone="accent" bar="left" className="mt-6">
        <form onSubmit={enviar} noValidate className="space-y-4">
          {erroGeral ? (
            <p
              role="alert"
              className="border-accent-200 bg-accent-50 text-accent-700 rounded-lg border px-3.5 py-3 text-sm"
            >
              {erroGeral}
            </p>
          ) : null}

          {confirmado ? (
            <p
              role="status"
              className="border-primary-200 bg-primary-50 text-primary-700 rounded-lg border px-3.5 py-3 text-sm"
            >
              Senha alterada. Da próxima vez, entre com a nova.
            </p>
          ) : null}

          <Field label="Senha atual" error={erros.senhaAtual} required>
            <Input
              name="senhaAtual"
              type="password"
              value={senhaAtual}
              onChange={(evento) => setSenhaAtual(evento.target.value)}
              autoComplete="current-password"
            />
          </Field>

          <Field label="Nova senha" error={erros.novaSenha} required>
            <Input
              name="novaSenha"
              type="password"
              value={novaSenha}
              onChange={(evento) => setNovaSenha(evento.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirmar nova senha" error={erros.confirmacao} required>
            <Input
              name="confirmacao"
              type="password"
              value={confirmacao}
              onChange={(evento) => setConfirmacao(evento.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" loading={enviando} loadingText="Alterando…" className="mt-2">
            Alterar senha
          </Button>
        </form>
      </Card>
    </div>
  )
}
