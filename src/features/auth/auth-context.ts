import { createContext, useContext } from 'react'
import type { Usuario } from '../../lib/sessao'

export interface AuthContextValue {
  /** Quem está autenticado, ou null quando não há sessão. */
  usuario: Usuario | null
  autenticado: boolean
  /**
   * Autentica e registra a sessão. Devolve o usuário para a tela decidir para
   * onde ir, já que o destino depende do perfil.
   */
  login: (codigoMatricula: string, senha: string) => Promise<Usuario>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Acesso à sessão.
 *
 * Vive em arquivo próprio, e não junto do provider, porque um arquivo que
 * exporta componente e função comum faz o Fast Refresh do Vite recarregar a
 * página inteira. Mesmo motivo de `components/field-context.ts`.
 */
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext)

  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  }

  return contexto
}
