import { useRequisicao } from '../../lib/useRequisicao'

import {
  buscarRankingDeGrupos,
  buscarRankingIndividual,
  traduzirErroDoRanking,
} from './rankings.api'
import type { RespostaDeRanking, RespostaDoRankingIndividual } from './rankings.tipos'

/**
 * Ranking de grupos (parcial ou anual), conforme o `bimestreId`.
 *
 * A chave inclui o `bimestreId` porque trocar entre anual e parcial (ou entre
 * bimestres) deve disparar uma busca nova, e a resposta muda de `tipo` e de
 * `itens`. O `bimestreId` `undefined` é exatamente o caso do anual, que a API
 * distingue por não enviar o parâmetro.
 *
 * As duas consultas de ranking passam pelo mesmo tradutor de erro porque
 * compartilham a mesma recusa possível: são endpoints de professor, e o `403`
 * é a resposta que a API dá quando quem pede é o aluno ou quando o recurso não
 * é do escopo de quem pediu.
 */
export function useRankingDeGrupos(
  competicaoId: string | undefined,
  bimestreId: string | undefined,
) {
  return useRequisicao<RespostaDeRanking | null>(
    () =>
      competicaoId
        ? buscarRankingDeGrupos(competicaoId, bimestreId)
        : Promise.resolve(null),
    `ranking-grupos:${competicaoId ?? ''}:${bimestreId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar o ranking.', traduzirErro: traduzirErroDoRanking },
  )
}

/** Ranking individual anual. */
export function useRankingIndividual(competicaoId: string | undefined) {
  return useRequisicao<RespostaDoRankingIndividual | null>(
    () => (competicaoId ? buscarRankingIndividual(competicaoId) : Promise.resolve(null)),
    `ranking-individual:${competicaoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível carregar o ranking individual.',
      traduzirErro: traduzirErroDoRanking,
    },
  )
}
