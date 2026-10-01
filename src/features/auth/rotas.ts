import { TIPO_USUARIO } from '../../lib/sessao'
import type { TipoUsuario } from '../../lib/sessao'
import { ROTA_ALUNO } from '../aluno/rotas'

/**
 * Rotas de autenticação, em um arquivo só.
 *
 * Concentradas aqui porque aparecem em três lugares que precisam concordar: a
 * tabela de rotas (src/app/App.tsx), o redirecionamento do login e o da rota
 * protegida. Divulgadas pelo índice de `features/auth`, e não pela pasta do
 * app, porque quem precisa delas é o fluxo de autenticação.
 */

export const ROTA_LOGIN = '/login'
export const ROTA_SALAS = '/salas'
export const ROTA_CONTA_SENHA = '/conta/senha'

/**
 * Para onde cada perfil vai depois de entrar.
 *
 * O tipo vem do token, não do que a pessoa digitou: professor e aluno entram
 * pela mesma tela, com o mesmo código de matrícula no padrão `26XXX`, e só a
 * API sabe qual dos dois é.
 *
 * A rota do aluno vem de `features/aluno/rotas`, importada direto do arquivo
 * folha e não do índice da feature: o índice carrega a página do aluno, que
 * depende deste módulo, e a importação viraria um ciclo.
 */
export function rotaInicial(tipo: TipoUsuario): string {
  return tipo === TIPO_USUARIO.PROFESSOR ? ROTA_SALAS : ROTA_ALUNO
}

/**
 * Rota de onde a pessoa foi despejada antes de entrar, guardada em
 * `location.state` pelo `ProtectedRoute`.
 *
 * Só aceita caminho interno: o `state` vem do router, mas o valor é dados
 * exatos do que a API e o navegador escreveram no histórico, e uma origem
 * absoluta ali viraria um redirecionamento para fora do site.
 */
export function rotaDeRetorno(state: unknown): string | null {
  const de = (state as { de?: unknown } | null)?.de

  if (typeof de !== 'string') return null
  if (!de.startsWith('/') || de.startsWith('//')) return null

  return de
}
