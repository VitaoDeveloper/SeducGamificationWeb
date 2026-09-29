import axios from 'axios'
import { limparSessao, lerToken } from './sessao'

const BASE_PADRAO = 'http://localhost:3000'

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || BASE_PADRAO

if (!import.meta.env.VITE_API_BASE_URL) {
  // A API não tem prefixo global de rota: os caminhos são relativos à raiz
  // (`/auth/login`, `/salas`). Por isso o baseURL é só a origem.
  console.warn(
    `[api] VITE_API_BASE_URL não definida. Usando ${BASE_PADRAO}. Copie .env.example para .env.`,
  )
}

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Não encerra a sessão quando a resposta for 401.
     *
     * Existe porque a API usa 401 para duas coisas diferentes: token inválido
     * ou expirado (sessão acabada) e credencial recusada no corpo da requisição
     * (senha de login errada, senha atual errada na troca). Só o primeiro caso
     * deve derrubar a sessão; o segundo é erro do formulário e precisa aparecer
     * na tela, com o professor logado.
     *
     * Vale para a chamada em que está, e é o interceptor que respeita — nenhuma
     * tela precisa saber que a distinção existe.
     */
    semSessaoAoExpirar?: boolean
  }
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
    /*
     * 401 fora das chamadas marcadas: a sessão acabou.
     *
     * Encerra a sessão pela guarda (src/lib/sessao.ts) em vez de recarregar a
     * página, e deixa a navegação por conta do router: o `AuthProvider` acorda
     * com o usuário nulo, o `ProtectedRoute` redireciona para o login e guarda
     * em `state` a rota que a pessoa tentava abrir. Assim, quando ela entrar de
     * novo, volta para onde estava em vez de cair na tela inicial. O botão
     * "voltar" do navegador também continua funcionando, porque nenhuma entrada
     * de histórico foi criada aqui.
     */
    if (erro?.response?.status === 401 && !erro?.config?.semSessaoAoExpirar) {
      limparSessao()
    }
    return Promise.reject(erro)
  },
)
