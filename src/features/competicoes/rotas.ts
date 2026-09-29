/**
 * Rotas da competição.
 *
 * O detalhe da competição é alcançado a partir da aba da sala
 * (`/salas/:salaId/competicoes`, registrada em `features/salas/rotas.ts`), então
 * a rota da sala mora lá e esta aqui começa no id da competição. As duas se
 * juntam na tabela de rotas (`src/app/App.tsx`), que é quem precisa das duas.
 */
export const ROTA_COMPETICAO_DETALHE = '/competicoes/:competicaoId'

/** `/competicoes/{id}` — dados gerais, bimestres e grupos. */
export function rotaDaCompeticao(competicaoId: string): string {
  return `/competicoes/${competicaoId}`
}
