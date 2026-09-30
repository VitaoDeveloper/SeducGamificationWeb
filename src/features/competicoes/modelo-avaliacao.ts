/**
 * Modelo de avaliação da escola, que decide o formato do lançamento de nota.
 *
 * A escola é numérica (1 a 10) ou conceitual (I, R, B, MB — o CPS da ETEC), e o
 * campo que o professor preenche precisa mudar junto: escrever "8.5" num seletor
 * de rótulos, ou "MB" num campo numérico, erra a cada aluno da turma.
 *
 * **A API não expõe o modelo da escola.** Não existe rota de modelos de
 * avaliação, e `GET /salas` devolve `escola: { id, nome }` por um `select`
 * explícito que não inclui `modeloAvaliacao`. O `LancamentosService` usa o modelo
 * por dentro, só para recusar valor fora da escala com 400. Enquanto isso,
 * `modeloAvaliacaoDaEscola` é a costura: ela devolve o modelo do seed da API
 * (CPS ETEC, que é a escola de exemplo) e, quando existir a rota, muda o corpo
 * dela. Os componentes recebem o modelo por prop, então nada mais muda junto —
 * nem a validação, que já espelha a do backend.
 */

import type { EscolaResumo } from '../salas/salas.tipos'

export const TIPO_ESCALA = {
  NUMERICA: 'NUMERICA',
  CPS_ETEC: 'CPS_ETEC',
} as const

export type TipoEscala = (typeof TIPO_ESCALA)[keyof typeof TIPO_ESCALA]

export interface ModeloAvaliacao {
  tipoEscala: TipoEscala
  /**
   * Rótulos do modelo conceitual, na ordem da escala. Vazio no numérico, que não
   * tem rótulo: o professor digita o número.
   */
  rotulos: string[]
}

export interface ValidacaoDeValor {
  valido: boolean
  /** Texto a mostrar no campo da nota, quando o valor não serve. */
  erro?: string
}

/** Escola numérica: o professor digita a nota de 1 a 10. */
export const MODELO_NUMERICO: ModeloAvaliacao = {
  tipoEscala: TIPO_ESCALA.NUMERICA,
  rotulos: [],
}

/** Escola conceitual: o professor escolhe um dos rótulos da escala. */
export const MODELO_CPS_ETEC: ModeloAvaliacao = {
  tipoEscala: TIPO_ESCALA.CPS_ETEC,
  rotulos: ['I', 'R', 'B', 'MB'],
}

/** Limites do `Input type="number"`, que espelham a validação do backend. */
export const ESCALA_NUMERICA = { minimo: 1, maximo: 10, passo: 0.01 } as const

/*
 * O mesmo `REGEX_NUMERICO` do `LancamentosService`: uma ou duas casas inteiras e
 * até duas decimais, com ponto. "8,5", "8.567" e "11" caem fora.
 */
const REGEX_NUMERICO = /^\d{1,2}(\.\d{1,2})?$/

/** O modelo pede um número digitado, e não um seletor de rótulos? */
export function ehEscalaNumerica(modelo: ModeloAvaliacao): boolean {
  return modelo.tipoEscala === TIPO_ESCALA.NUMERICA
}

/**
 * O modelo de avaliação da escola da competição.
 *
 * O parâmetro existe para marcar a costura: é por ele que a escola entra na
 * conta no dia em que a API expuser `modeloAvaliacao`. Hoje não há o que ler
 * dele, e devolver o padrão é uma escolha declarada, não um esquecimento — por
 * isso fica neste arquivo e não espalhada pelas telas.
 */
export function modeloAvaliacaoDaEscola(escola: EscolaResumo | null | undefined): ModeloAvaliacao {
  void escola
  return MODELO_CPS_ETEC
}

/**
 * Confere uma nota contra o modelo, com as mesmas regras do `LancamentosService`.
 *
 * Roda no formulário para o erro aparecer no campo da nota antes da ida ao
 * servidor. O backend continua sendo quem decide: ele valida o modelo do banco,
 * que pode não ser o que a tela assumiu, e o erro dele é exibido como está.
 */
export function validarValorNoModelo(
  modelo: ModeloAvaliacao,
  valor: string,
): ValidacaoDeValor {
  const limpo = valor.trim()

  if (!limpo) return { valido: false, erro: 'Informe a nota.' }

  if (ehEscalaNumerica(modelo)) {
    if (!REGEX_NUMERICO.test(limpo)) {
      return { valido: false, erro: 'Use número de 1 a 10, com ponto decimal — ex.: 8.5.' }
    }

    const numero = Number(limpo)
    if (numero < ESCALA_NUMERICA.minimo || numero > ESCALA_NUMERICA.maximo) {
      return { valido: false, erro: 'A nota precisa estar entre 1 e 10.' }
    }

    return { valido: true }
  }

  if (!modelo.rotulos.includes(limpo)) {
    return { valido: false, erro: `Escolha um destes rótulos: ${modelo.rotulos.join(', ')}.` }
  }

  return { valido: true }
}
