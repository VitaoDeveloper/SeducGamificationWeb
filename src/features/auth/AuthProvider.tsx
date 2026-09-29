import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { gravarSessao, inscrever, lerUsuario, limparSessao } from '../../lib/sessao'
import type { Usuario } from '../../lib/sessao'
import { autenticar } from './auth.api'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { ROTA_LOGIN } from './rotas'

/**
 * Sessão da aplicação, espelhando a guarda de `src/lib/sessao.ts` no estado do
 * React.
 *
 * A assinatura é o que amarra os dois: quem chama `limparSessao()` (o interceptor
 * do axios, num 401) não sabe que existe React, e o provider não sabe que
 * existem requisições. Cada um sabe só da sua ponta.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navegar = useNavigate()

  /*
   * Sem estado de "carregando": a guarda já foi lida do `localStorage` quando
   * este módulo carregou, então o valor inicial está certo no primeiro render.
   * Com um estado intermediário, um refresh com usuário logado piscaria a tela
   * de login antes de voltar para a página de destino.
   */
  const [usuario, setUsuario] = useState<Usuario | null>(lerUsuario)

  useEffect(() => inscrever(() => setUsuario(lerUsuario())), [])

  const login = useCallback(async (codigoMatricula: string, senha: string) => {
    const sessao = await autenticar(codigoMatricula, senha)
    gravarSessao(sessao)
    return sessao.usuario
  }, [])

  const logout = useCallback(() => {
    limparSessao()
    /*
     * `replace` para o botão "voltar" do navegador não devolver a pessoa para a
     * tela protegida que ela acabou de abandonar. Sem `state`, a tela de login
     * também não guarda rota de retorno: quem saiu de propósito não deve ser
     * jogado de volta ao `/conta/senha` por ter entrado de novo.
     */
    navegar(ROTA_LOGIN, { replace: true })
  }, [navegar])

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      autenticado: usuario !== null,
      login,
      logout,
    }),
    [usuario, login, logout],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
