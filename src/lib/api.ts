import axios from 'axios'
import { limparToken, lerToken } from './auth-token'

const BASE_PADRAO = 'http://localhost:3000'

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || BASE_PADRAO

if (!import.meta.env.VITE_API_BASE_URL) {
  // A API não tem prefixo global de rota: os caminhos são relativos à raiz
  // (`/auth/login`, `/salas`). Por isso o baseURL é só a origem.
  console.warn(
    `[api] VITE_API_BASE_URL não definida. Usando ${BASE_PADRAO}. Copie .env.example para .env.`,
  )
}

/**
 * Instância única do axios para toda a aplicação.
 *
 * `withCredentials` fica desligado de propósito: a API autentica pelo header
 * `Authorization: Bearer`, não por cookie, então enviar credenciais só
 * apertaria a regra de CORS sem necessidade.
 */
export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/** Evita redirecionar em laço quando a própria tela de login tomar 401. */
let redirecionandoParaLogin = false

api.interceptors.request.use((config) => {
  const token = lerToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    // A Etapa 02 substitui este desvio por uma navegação do router, para
    // preservar a rota de retorno em vez de recarregar a página inteira.
    if (erro?.response?.status === 401 && !redirecionandoParaLogin) {
      redirecionandoParaLogin = true
      limparToken()
      window.location.assign('/entrar')
    }
    return Promise.reject(erro)
  },
)
