import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input } from '../../components'
import { mensagemDeErro } from '../../lib/erro-api'
import { useAuth } from './auth-context'
import { rotaDeRetorno, rotaInicial } from './rotas'

interface ErrosDoFormulario {
  codigoMatricula?: string
  senha?: string
}

/**
 * Tela de entrada, a mesma para professor e aluno.
 *
 * Os dois entram com código de matrícula no padrão `26XXX` e com senha, e a
 * diferença entre os perfis só aparece depois: é a API que diz, no token, qual
 * dos dois é, e a tela segue para a rota inicial daquele perfil.
 */
export function LoginPage() {
  const { usuario, login } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()

  const [codigoMatricula, setCodigoMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosDoFormulario>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  /*
   * Quem já tem sessão ao chegar aqui não tem o que fazer nesta tela.
   *
   * O usuário é lido uma vez, na entrada, e não a cada render. Se fosse lido ao
   * vivo, o login bem-sucedido dispararia o mesmo redirect: `login()` grava a
   * sessão, o provider re-renderiza, e o `<Navigate>` competiria com a
   * navegação feita no `enviar` — sempre para a tela inicial do perfil,
   * descartando a rota de retorno que o `ProtectedRoute` tinha guardado.
   */
  const [usuarioNaEntrada] = useState(usuario)

  if (usuarioNaEntrada) {
    return <Navigate to={rotaInicial(usuarioNaEntrada.tipo)} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (enviando) return

    const novosErros: ErrosDoFormulario = {}
    if (!codigoMatricula.trim()) {
      novosErros.codigoMatricula = 'Informe o código de matrícula.'
    }
    if (!senha) {
      novosErros.senha = 'Informe a senha.'
    }

    setErros(novosErros)
    setErroGeral(null)
    if (Object.keys(novosErros).length > 0) return

    setEnviando(true)
    try {
      const autenticado = await login(codigoMatricula.trim(), senha)
      // Volta para onde a pessoa queria estar se o acesso veio de uma rota
      // protegida; senão, para a tela inicial do perfil que entrou.
      const retorno = rotaDeRetorno(local.state)
      navegar(retorno ?? rotaInicial(autenticado.tipo), { replace: true })
    } catch (erro) {
      // A API responde 401 com "Código de matrícula ou senha inválidos.", que
      // é exatamente o que a pessoa precisa ler. A mensagem vem do servidor
      // para não haver dois textos diferentes para o mesmo erro.
      setErroGeral(mensagemDeErro(erro, 'Não foi possível entrar. Tente de novo.'))
      setEnviando(false)
    }
  }

  return (
    <main className="bg-institucional flex min-h-screen flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="text-center">
          <span
            aria-hidden
            className="bg-primary-600 font-display inline-flex size-12 items-center justify-center rounded-full text-lg font-bold text-white"
          >
            SG
          </span>
          <h1 className="mt-4 text-2xl">Seduc Gamification</h1>
          <p className="text-neutral-600 mt-1.5 text-sm">
            Competição gamificada entre equipes de alunos
          </p>
        </div>

        <Card tone="primary" bar="top" className="mt-8">
          <form onSubmit={enviar} noValidate className="space-y-4">
            <h2 className="text-lg font-semibold">Entrar</h2>

            {erroGeral ? (
              <p
                role="alert"
                className="border-accent-200 bg-accent-50 text-accent-700 rounded-lg border px-3.5 py-3 text-sm"
              >
                {erroGeral}
              </p>
            ) : null}

            <Field label="Código de matrícula" error={erros.codigoMatricula} required>
              <Input
                name="codigoMatricula"
                value={codigoMatricula}
                onChange={(evento) => setCodigoMatricula(evento.target.value)}
                placeholder="26001"
                prefix="#"
                autoComplete="username"
                inputMode="numeric"
                autoFocus
              />
            </Field>

            <Field
              label="Senha"
              error={erros.senha}
              required
              hint="No primeiro acesso a senha é o próprio código de matrícula. Dá para trocar depois, no menu da conta."
            >
              <Input
                name="senha"
                type="password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                autoComplete="current-password"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={enviando}
              loadingText="Entrando…"
              className="mt-2"
            >
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </main>
  )
}
