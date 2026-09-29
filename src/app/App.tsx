import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components'
import { AuthProvider, LoginPage, ROTA_LOGIN, rotaInicial, TrocarSenhaPage, useAuth } from '../features/auth'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { EmBrevePage } from './pages/EmBrevePage'
import { SalasPage } from './pages/SalasPage'

/**
 * Raiz `/` e qualquer caminho desconhecido: leva para a tela inicial do perfil,
 * ou para o login quando não há sessão. Em vez de uma página de "não encontrado",
 * que para este sistema só apareceria por digitar a URL à mão.
 */
function RotaInicial() {
  const { usuario } = useAuth()
  return <Navigate to={usuario ? rotaInicial(usuario.tipo) : ROTA_LOGIN} replace />
}

/**
 * Shell da aplicação: provedores globais e tabela de rotas.
 *
 * A ordem dos provedores importa. O `ToastProvider` fica no topo porque toda
 * tela precisa notificar; o `BrowserRouter` vem antes do `AuthProvider` porque
 * o logout navega para o login, e `useNavigate` só funciona dentro do router.
 */
export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path={ROTA_LOGIN} element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RotaInicial />} />
              <Route path="salas" element={<SalasPage />} />
              <Route path="conta/senha" element={<TrocarSenhaPage />} />
              <Route path="em-breve" element={<EmBrevePage />} />
            </Route>

            <Route path="*" element={<RotaInicial />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}
