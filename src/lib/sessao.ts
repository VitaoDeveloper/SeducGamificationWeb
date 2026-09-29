/**
 * Guarda da sessão: token JWT e usuário autenticado.
 *
 * Fica fora do React de propósito, porque dois consumidores precisam dela e um
 * deles não é um componente:
 *
 * 1. o interceptor de `src/lib/api.ts`, que anexa o token em toda requisição e,
 *    num 401, chama `limparSessao()`;
 * 2. o `AuthProvider`, que assina com `inscrever()` e reflete a mudança no
 *    estado do React.
 *
 * A alternativa seria o interceptor guardar uma referência mutável para o
 * contexto, mas aí api.ts passaria a depender de features/auth, e a dependência
 * ficaria invertida: quem sabe falar HTTP é que estaria sabendo de sessão. Com
 * este módulo, a dependência é de baixo para cima — o `AuthProvider` conhece a
 * guarda, e nunca o contrário.
 *
 * O token também vai para o `localStorage`, para sobreviver a um refresh. É a
 * escolha do protótipo; avaliar trocar por memória antes de qualquer uso real,
 * porque o token é de longa duração (8 h na API) e o XSS tem escopo de leitura
 * direto nele.
 */

export const TIPO_USUARIO = {
  PROFESSOR: 'PROFESSOR',
  ALUNO: 'ALUNO',
} as const

export type TipoUsuario = (typeof TIPO_USUARIO)[keyof typeof TIPO_USUARIO]

export interface Usuario {
  id: string
  tipo: TipoUsuario
  /**
   * O que foi digitado no login.
   *
   * `GET /auth/me` devolve só `id` e `tipo`, então o código de matrícula é
   * guardado aqui para o cabeçalho ter o que mostrar no lugar do nome. A API
   * não devolve o nome do usuário em nenhum endpoint de autenticação.
   */
  codigoMatricula: string
}

export interface Sessao {
  token: string
  usuario: Usuario
}

const CHAVE_TOKEN = 'seduc-gamification:token'
const CHAVE_USUARIO = 'seduc-gamification:usuario'

const ehTipoUsuario = (valor: unknown): valor is TipoUsuario =>
  valor === TIPO_USUARIO.PROFESSOR || valor === TIPO_USUARIO.ALUNO

/**
 * Lê a sessão do `localStorage`, descartando o que estiver incompleto ou
 * adulterado. Um usuário gravado pela versão anterior do código, ou lixo, é
 * tratado como "não logado" em vez de estourar um erro na tela.
 */
function lerDoNavegador(): Usuario | null {
  const bruto = globalThis.localStorage?.getItem(CHAVE_USUARIO)
  if (!bruto) return null

  try {
    const usuario = JSON.parse(bruto) as Partial<Usuario>
    if (
      typeof usuario?.id !== 'string' ||
      !ehTipoUsuario(usuario?.tipo) ||
      typeof usuario?.codigoMatricula !== 'string'
    ) {
      return null
    }
    return usuario as Usuario
  } catch {
    return null
  }
}

function gravarNoNavegador(usuario: Usuario | null): void {
  if (!usuario) {
    globalThis.localStorage?.removeItem(CHAVE_TOKEN)
    globalThis.localStorage?.removeItem(CHAVE_USUARIO)
    return
  }
  globalThis.localStorage?.setItem(CHAVE_USUARIO, JSON.stringify(usuario))
}

/**
 * Estado corrente, espelhado no `localStorage`.
 *
 * Começa já preenchido: ler o armazenamento é síncrono, então um refresh com
 * usuário logado monta a sessão no primeiro render, sem passar por um estado
 * de "carregando" nem piscar a tela de login.
 */
let tokenAtual: string | null = globalThis.localStorage?.getItem(CHAVE_TOKEN) ?? null
let usuarioAtual: Usuario | null = lerDoNavegador()

/** Token para o interceptor do axios. */
export function lerToken(): string | null {
  return tokenAtual
}

/** Usuário da sessão corrente, ou null. */
export function lerUsuario(): Usuario | null {
  return usuarioAtual
}

/**
 * Registra uma sessão válida e avisa os assinantes. Chamada pelo login, com o
 * token e o usuário que vieram da API.
 */
export function gravarSessao(sessao: Sessao): void {
  tokenAtual = sessao.token
  usuarioAtual = sessao.usuario
  globalThis.localStorage?.setItem(CHAVE_TOKEN, sessao.token)
  gravarNoNavegador(sessao.usuario)
  avisar()
}

/**
 * Encerra a sessão e avisa os assinantes.
 *
 * Sai em silêncio quando já não há sessão, para um 401 em paralelo não gerar
 * um segundo aviso ao `AuthProvider` — o qual receberia um estado idêntico e
 * não mudaria nada, mas ainda assim acordaria o React à toa.
 */
export function limparSessao(): void {
  if (!tokenAtual && !usuarioAtual) return

  tokenAtual = null
  usuarioAtual = null
  globalThis.localStorage?.removeItem(CHAVE_TOKEN)
  gravarNoNavegador(null)
  avisar()
}

const ouvintes = new Set<() => void>()

function avisar(): void {
  for (const ouvinte of ouvintes) ouvinte()
}

/** Assina as mudanças de sessão. Devolve a função para cancelar a assinatura. */
export function inscrever(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
