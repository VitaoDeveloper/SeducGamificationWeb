import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROTA_LOGIN, useAuth } from '../features/auth'

/**
 * Barreira das rotas que exigem sessão.
 *
 * Envolve o `AuthenticatedLayout` inteiro, e não cada tela: um 401 que chegue
 * no meio de uma troca de telas só precisa derrubar a sessão uma vez para o
 * layout sair da frente e o redirecionamento acontecer.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const local = useLocation()

  if (!usuario) {
    /*
     * A rota tentada vai em `state`, não em query string: some da URL e da
     * barra de endereço, e a tela de login a recupera depois de autenticar para
     * devolver a pessoa para onde ela ia.
     */
    return <Navigate to={ROTA_LOGIN} replace state={{ de: local.pathname + local.search }} />
  }

  return <>{children}</>
}
