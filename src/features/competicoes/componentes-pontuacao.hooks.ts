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

/**
 * Notas já lançadas em vários componentes, de uma vez.
 *
 * Existe porque a prévia de síntese (Etapa 06) precisa das notas de mais de um
 * componente, e a API só lista por componente — não há rota que pegue as notas de
 * um bimestre inteiro. São N chamadas em paralelo, que é o que a Etapa 06
 * autoriza ("uma ou mais chamadas a `GET /componentes-pontuacao/:id/lancamentos`").
 *
 * Volta num `Map` por componente, e não numa lista achatada: a montagem da prévia
 * sempre pergunta "o que este aluno tem neste componente", e um mapa responde sem
 * varrer a lista. A chave da requisição é a lista de ids, para trocar de
 * componente ou de bimestre refazer a busca em vez de herdar as notas do anterior.
 *
 * A lista chega como array e a `chave` é a sua junção: o `useRequisicao` guarda o
 * carregador numa ref justamente para não refazer a busca a cada render, e um
 * array novo a cada render não pode virar dependência.
 */
export function useLancamentosDeComponentes(componentePontuacaoIds: readonly string[]) {
  const chave = componentePontuacaoIds.join(',')

  return useRequisicao<Map<string, Lancamento[]> | null>(
    async () => {
      const respostas = await Promise.all(componentePontuacaoIds.map((id) => listarLancamentos(id)))

      return new Map(
        componentePontuacaoIds.map((id, indice) => [id, respostas[indice] ?? []]),
      )
    },
    `lancamentos-de-componentes:${chave}`,
    { erroPadrao: 'Não foi possível carregar as notas lançadas.' },
  )
}
