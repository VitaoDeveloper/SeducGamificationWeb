import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button } from '../components'
import { ROTA_CONTA_SENHA, useAuth } from '../features/auth'
import { TIPO_USUARIO } from '../lib/sessao'

const ROTULO_DO_PERFIL = {
  [TIPO_USUARIO.PROFESSOR]: 'Professor',
  [TIPO_USUARIO.ALUNO]: 'Aluno',
} as const

const LINK_CONTA =
  'text-neutral-700 hover:text-primary-700 rounded-full px-3.5 py-2 text-sm font-medium transition-colors'

/**
 * Moldura das telas autenticadas: cabeçalho, menu de conta e a área de conteúdo.
 *
 * Entra como rota de layout, com `<Outlet />` no lugar do conteúdo, e nunca
 * diretamente no código: o `ProtectedRoute` a envolve, então ela só é montada
 * com sessão aberta e não precisa conferir usuário a cada uso.
 */
export function AuthenticatedLayout() {
  const { usuario, logout } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-institucional border-line border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
          {/* A marca leva à raiz, que já redireciona para a tela inicial do
              perfil — assim o link não precisa saber o tipo de quem está logado. */}
          <Link to="/" className="font-display text-base font-bold tracking-tight text-neutral-800">
            Seduc Gamification
          </Link>

          {usuario ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="mr-1 text-right">
                <p className="text-neutral-500 text-xs">{ROTULO_DO_PERFIL[usuario.tipo]}</p>
                <p className="font-display text-sm font-semibold text-neutral-800">
                  {usuario.codigoMatricula}
                </p>
              </div>

              <NavLink
                to={ROTA_CONTA_SENHA}
                className={({ isActive }) =>
                  `${LINK_CONTA} ${isActive ? 'text-primary-700 underline' : ''}`
                }
              >
                Trocar senha
              </NavLink>

              <Button variant="outline" size="sm" onClick={logout}>
                Sair
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
