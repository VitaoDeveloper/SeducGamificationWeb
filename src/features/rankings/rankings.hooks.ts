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
 *
 * `revalidacao` é um contador, e não um booleano: o que a tela quer é "busca de
 * novo, e só uma vez", e um contador na chave garante isso mesmo quando a Etapa 09
 *resolve dois empates no mesmo segundo. Ele entra na chave — e não como
 * dependência à parte — porque é a chave que comanda a busca em `useRequisicao`.
 */
export function useRankingDeGrupos(
  competicaoId: string | undefined,
  bimestreId: string | undefined,
  revalidacao = 0,
) {
  return useRequisicao<RespostaDeRanking | null>(
    () =>
      competicaoId
        ? buscarRankingDeGrupos(competicaoId, bimestreId)
        : Promise.resolve(null),
    `ranking-grupos:${competicaoId ?? ''}:${bimestreId ?? ''}:${revalidacao}`,
    { erroPadrao: 'Não foi possível carregar o ranking.', traduzirErro: traduzirErroDoRanking },
  )
}

/** Ranking individual anual. `revalidacao` tem o mesmo papel do ranking de grupos. */
export function useRankingIndividual(competicaoId: string | undefined, revalidacao = 0) {
  return useRequisicao<RespostaDoRankingIndividual | null>(
    () => (competicaoId ? buscarRankingIndividual(competicaoId) : Promise.resolve(null)),
    `ranking-individual:${competicaoId ?? ''}:${revalidacao}`,
    {
      erroPadrao: 'Não foi possível carregar o ranking individual.',
      traduzirErro: traduzirErroDoRanking,
    },
  )
}
