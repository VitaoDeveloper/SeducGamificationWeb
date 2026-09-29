/**
 * Rotas de sala, lecionamento e aluno, em um arquivo só.
 *
 * Aparecem em três lugares que precisam concordar: a tabela de rotas
 * (`src/app/App.tsx`), os links dentro das telas e a rota de retorno do
 * `ProtectedRoute`.
 *
 * `ROTA_SALAS` mora em `features/auth/rotas.ts` e não aqui, porque é a rota
 * inicial do professor depois do login e quem precisa dela é o fluxo de
 * autenticação. O valor é o mesmo nas duas pontas — uma string duplicada, e
 * não uma dependência de `auth` para `salas` (e vice-versa) que só existiria
 * para não repetir um literal.
 */
export const ROTA_SALAS_DETALHE = '/salas/:salaId'
export const ROTA_SALAS_ALUNOS = '/salas/:salaId/alunos'
export const ROTA_SALAS_COMPETICOES = '/salas/:salaId/competicoes'

/** `/salas/{id}` — dados da sala, lecionamentos e inscrição. */
export function rotaDaSala(salaId: string): string {
  return `/salas/${salaId}`
}

/** `/salas/{id}/alunos` — listagem e cadastro de alunos. */
export function rotaDosAlunos(salaId: string): string {
  return `${rotaDaSala(salaId)}/alunos`
}

/** `/salas/{id}/competicoes` — competições de cada lecionamento da sala. */
export function rotaDasCompeticoes(salaId: string): string {
  return `${rotaDaSala(salaId)}/competicoes`
}
