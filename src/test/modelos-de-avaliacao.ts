/**
 * Os modelos de avaliação como a API os manda, e o `ModeloAvaliacao` que sai deles.
 *
 * Ficam aqui, e não em `features/competicoes/modelo-avaliacao.ts`, porque são
 * insumo de teste: os componentes recebem o modelo por prop, e um teste que
 * montasse a escala à mão descreveria um objeto que a tela nunca vai receber. O
 * modelo do teste é o mesmo que a tela monta a partir da resposta da API, então um
 * teste que passa aqui está exercising o caminho de verdade.
 *
 * Os dois modelos do catálogo da API (RN: escala numérica 1 a 10 e CPS ETEC com
 * I, R, B, MB) estão lado a lado de propósito: quase todo bug de modelo é um teste
 * rodando com um só deles.
 */

import { modeloAvaliacaoDaEscola } from '../features/competicoes/modelo-avaliacao'
import type { ModeloAvaliacao } from '../features/competicoes/modelo-avaliacao'
import type { ModeloAvaliacaoDaEscola } from '../features/salas/salas.tipos'

/** Escola numérica: nota de 1 a 10, digitada — e por isso sem níveis. */
export const MODELO_NUMERICO_DA_API: ModeloAvaliacaoDaEscola = {
  tipoEscala: 'NUMERICA',
  nivelEscalas: [],
}

/** Escola conceitual: os quatro rótulos do CPS da ETEC, com o número de cada um. */
export const MODELO_CPS_ETEC_DA_API: ModeloAvaliacaoDaEscola = {
  tipoEscala: 'CPS_ETEC',
  nivelEscalas: [
    { rotulo: 'I', valorNumerico: 3 },
    { rotulo: 'R', valorNumerico: 5 },
    { rotulo: 'B', valorNumerico: 8 },
    { rotulo: 'MB', valorNumerico: 10 },
  ],
}

/**
 * O modelo que a tela monta a partir do que a API mandou.
 *
 * Falha alto quando o resultado é `null`: um teste que recebe um modelo
 * inexistente é um teste montando o cenário errado, e seguir com um modelo
 * qualquer esconderia isso até uma asserção inexplicável falhar.
 */
export function modeloDoTeste(
  modeloAvaliacao: ModeloAvaliacaoDaEscola,
  nome = 'Escola do Teste',
): ModeloAvaliacao {
  const modelo = modeloAvaliacaoDaEscola({ id: 'escola-do-teste', nome, modeloAvaliacao })

  if (!modelo) throw new Error(`modelo de teste inválido: ${modeloAvaliacao.tipoEscala}`)

  return modelo
}

export const MODELO_NUMERICO = modeloDoTeste(MODELO_NUMERICO_DA_API, 'EE Numericista')
export const MODELO_CPS_ETEC = modeloDoTeste(MODELO_CPS_ETEC_DA_API, 'ETEC Conceitualista')