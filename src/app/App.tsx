import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components'
import { ShowcasePage } from './pages/ShowcasePage'

/**
 * Shell da aplicação: provedores globais e tabela de rotas.
 *
 * A Etapa 02 troca a rota `/` pela tela de login e acrescenta as rotas
 * protegidas. O `ToastProvider` já fica aqui porque toda tela precisa
 * notificar sucesso e erro.
 */
export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShowcasePage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
