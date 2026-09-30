import { useRequisicao } from '../../lib/useRequisicao'
import {
  listarComponentesDoBimestre,
  listarLancamentos,
  validarPesosDoBimestre,
} from './componentes-pontuacao.api'
import type {
  ComponentesDoBimestre,
  Lancamento,
  ValidacaoDePesosDaApi,
} from './componentes-pontuacao.tipos'

/**
 * Componentes de pontuação do bimestre, agrupados por matéria.
 *
 * A `chave` inclui o `bimestreId` porque é ele que muda a resposta: trocar o
 * seletor precisa disparar uma busca nova, e sem o id no cache cada aba aberta
 * trocaria a lista da outra.
 */
export function useComponentesDoBimestre(bimestreId: string | undefined) {
  return useRequisicao<ComponentesDoBimestre | null>(
    () => (bimestreId ? listarComponentesDoBimestre(bimestreId) : Promise.resolve(null)),
    `componentes-do-bimestre:${bimestreId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar os componentes de pontuação.' },
  )
}

/**
 * Veredito da API sobre os pesos do bimestre: fechou, e o que falta.
 *
 * Vai separado da lista porque responde a uma pergunta diferente — "dá para
 * encerrar o bimestre?" — e é a mesma chamada que a Etapa 07 vai usar para
 * recusar o encerramento. A lista diz o quanto falta em cada matéria, com
 * detalhe; esta diz se sobrou alguma.
 */
export function useValidacaoDePesos(bimestreId: string | undefined) {
  return useRequisicao<ValidacaoDePesosDaApi | null>(
    () => (bimestreId ? validarPesosDoBimestre(bimestreId) : Promise.resolve(null)),
    `validacao-de-pesos:${bimestreId ?? ''}`,
    { erroPadrao: 'Não foi possível conferir a soma dos pesos.' },
  )
}

/** Notas já lançadas no componente, com o aluno embutido. */
export function useLancamentos(componentePontuacaoId: string | undefined) {
  return useRequisicao<Lancamento[] | null>(
    () =>
      componentePontuacaoId
        ? listarLancamentos(componentePontuacaoId)
        : Promise.resolve<Lancamento[]>([]),
    `lancamentos:${componentePontuacaoId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar as notas lançadas.' },
  )
}
