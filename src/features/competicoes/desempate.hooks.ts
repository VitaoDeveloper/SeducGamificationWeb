import { useRequisicao } from '../../lib/useRequisicao'

import { listarPendenciasDeDesempate, traduzirErroDoDesempate } from './desempate.api'
import type { PendenciaDeDesempate } from './desempate.tipos'

/**
 * Os empates que ainda precisam de decisão do professor, em qualquer escopo.
 *
 * A chamada é da competição inteira e não de um bimestre porque é assim que a
 * pendência se comporta: um empate do 1º bimestre continua pendente depois que o
 * professor abre o 4º, e uma tela que só perguntasse "o bimestre que estou vendo
 * tem empate?" esconderia os outros.
 *
 * Ela roda assim que a competição carrega e é recarregada em dois momentos que
 * não são efeito: depois do encerramento (que é quando um empate nasce) e depois
 * de um desempate aceito (que é quando ele deixa de existir). Nos dois casos quem
 * manda é a página, porque quem sabe o que acabou de acontecer é ela.
 */
export function usePendenciasDeDesempate(competicaoId: string | undefined) {
  return useRequisicao<PendenciaDeDesempate[]>(
    () =>
      competicaoId ? listarPendenciasDeDesempate(competicaoId) : Promise.resolve([]),
    `desempate-pendencias:${competicaoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível conferir os empates que precisam de desempate.',
      traduzirErro: traduzirErroDoDesempate,
    },
  )
}