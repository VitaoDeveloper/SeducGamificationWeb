/**
 * Guarda do token JWT.
 *
 * Ponto de extensão para a Etapa 02: hoje o login não existe, então o token
 * simplesmente nunca é setado e o interceptor de src/lib/api.ts roda sem
 * header nenhum. Quando o login entrar, é só chamar `definirTokenAposLogin`
 * aqui e todo o resto já funciona.
 *
 * `localStorage` é o armazenamento escolhido para o protótipo. Avaliar trocar
 * por memória (com reenvio do token pela Etapa 02) antes de qualquer uso real:
 * o token é de longa duração e o XSS tem escopo de leitura direto nele.
 */

const CHAVE = 'seduc-gamification:token'

export function lerToken(): string | null {
  return globalThis.localStorage?.getItem(CHAVE) ?? null
}

export function gravarToken(token: string): void {
  globalThis.localStorage?.setItem(CHAVE, token)
}

export function limparToken(): void {
  globalThis.localStorage?.removeItem(CHAVE)
}
