import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components'
import { AlunoDashboardPage, ROTA_ALUNO } from '../features/aluno'
import { AuthProvider, LoginPage, ROTA_LOGIN, rotaInicial, TrocarSenhaPage, useAuth } from '../features/auth'
import {
  CompeticaoDetailPage,
  CompeticoesDaSala,
  ROTA_COMPETICAO_DETALHE,
} from '../features/competicoes'
import {
  AlunosListPage,
  ROTA_SALAS_ALUNOS,
  ROTA_SALAS_COMPETICOES,
  ROTA_SALAS_DETALHE,
  SalaDetailPage,
  SalasListPage,
} from '../features/salas'
import {
  ROTA_RELATORIO_COMPARATIVO_DO_ALUNO,
  ROTA_RELATORIO_COMPARATIVO_DO_GRUPO,
  ROTA_RELATORIO_DO_GRUPO,
  ROTA_RELATORIO_INDIVIDUAL,
  RelatorioComparativoAlunoPage,
  RelatorioComparativoGrupoPage,
  RelatorioGrupoPage,
  RelatorioIndividualPage,
} from '../features/relatorios'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { ProtectedRoute } from './ProtectedRoute'

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
              <Route path="salas" element={<SalasListPage />} />
              {/*
                A ordem não resolve nada aqui: o react-router casa a rota mais
                específica primeiro, então `salas/:salaId/alunos` nunca é
                engolido por `salas/:salaId`.
              */}
              <Route path={ROTA_SALAS_ALUNOS} element={<AlunosListPage />} />
              <Route path={ROTA_SALAS_COMPETICOES} element={<CompeticoesDaSala />} />
              <Route path={ROTA_SALAS_DETALHE} element={<SalaDetailPage />} />
              <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
              <Route path="conta/senha" element={<TrocarSenhaPage />} />
              <Route path={ROTA_ALUNO} element={<AlunoDashboardPage />} />

              {/*
                Os quatro relatórios da Etapa 10 entram aqui, e não dentro de
                `/salas/:salaId/...`: eles são endereçados pelo aluno ou pelo grupo,
                e quem chega neles já tem o id do link. A `competicaoId` opcional
                viaja na query de quem sabe dela (a dos relatórios de aluno), porque
                a API só a exige quando o aluno participa de mais de uma competição.
              */}
              <Route path={ROTA_RELATORIO_INDIVIDUAL} element={<RelatorioIndividualPage />} />
              <Route
                path={ROTA_RELATORIO_COMPARATIVO_DO_ALUNO}
                element={<RelatorioComparativoAlunoPage />}
              />
              <Route path={ROTA_RELATORIO_DO_GRUPO} element={<RelatorioGrupoPage />} />
              <Route
                path={ROTA_RELATORIO_COMPARATIVO_DO_GRUPO}
                element={<RelatorioComparativoGrupoPage />}
              />
            </Route>

            <Route path="*" element={<RotaInicial />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}
