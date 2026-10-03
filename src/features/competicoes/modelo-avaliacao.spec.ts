import {
  ehEscalaNumerica,
  modeloAvaliacaoDaEscola,
  validarValorNoModelo,
} from './modelo-avaliacao'
import { MODELO_CPS_ETEC, MODELO_NUMERICO } from '../../test/modelos-de-avaliacao'
import { ESCOLA_A, ESCOLA_B } from '../../test/handlers'
import type { EscolaResumo } from '../salas/salas.tipos'

/** Escola no formato que a API manda, para montar o caso no ponto do teste. */
function escola(
  parcial: Partial<EscolaResumo> & Pick<EscolaResumo, 'modeloAvaliacao'>,
): EscolaResumo {
  return { id: 'escola', nome: 'Escola do Teste', ...parcial }
}

/**
 * Resposta de API desatualizada: a escola vem sem `modeloAvaliacao`.
 *
 * O cast é o caso, não um atalho — é uma resposta que não satisfaz o tipo
 * atual, e o `null` é o que a tela tem que fazer com ela.
 */
const ESCOLA_SEM_MODELO = { id: 'escola-antiga', nome: 'Escola Antiga' } as EscolaResumo

describe('modeloAvaliacaoDaEscola', () => {
  it('devolve o modelo que a API mandou, e não um palpite', () => {
    // A escola do seed é conceitual e a outra é numérica, e as duas estão no
    // mesmo professor: um teste com uma escola só não distinguiria "leu o modelo da
    // escola" de "devolveu o modelo fixo".
    expect(modeloAvaliacaoDaEscola(ESCOLA_A)).toEqual(MODELO_CPS_ETEC)
    expect(modeloAvaliacaoDaEscola(ESCOLA_B)).toEqual(MODELO_NUMERICO)
  })

  it('ordena os rótulos pelo número que valem, e não pela ordem do banco', () => {
    const embaralhado = escola({
      modeloAvaliacao: {
        tipoEscala: 'CPS_ETEC',
        nivelEscalas: [
          { rotulo: 'MB', valorNumerico: 10 },
          { rotulo: 'I', valorNumerico: 3 },
          { rotulo: 'B', valorNumerico: 8 },
          { rotulo: 'R', valorNumerico: 5 },
        ],
      },
    })

    const modelo = modeloAvaliacaoDaEscola(embaralhado)!

    expect(modelo.rotulos).toEqual(['I', 'R', 'B', 'MB'])
    expect(modelo.niveis.map((nivel) => nivel.valorNumerico)).toEqual([3, 5, 8, 10])
  })

  it('devolve null sem modelo, em vez de chutar um que a API vai recusar', () => {
    // Sala ainda carregando e API desatualizada chegam no mesmo `null`, e nenhum dos
    // dois casos pode virar campo de nota: um modelo inventado é lançado e devolvido
    // com 400 pelo LancamentosService.
    expect(modeloAvaliacaoDaEscola(undefined)).toBeNull()
    expect(modeloAvaliacaoDaEscola(null)).toBeNull()
    expect(modeloAvaliacaoDaEscola(ESCOLA_SEM_MODELO)).toBeNull()
    expect(
      modeloAvaliacaoDaEscola(
        escola({ modeloAvaliacao: { tipoEscala: 'DESCONHECIDO', nivelEscalas: [] } }),
      ),
    ).toBeNull()
  })

  it('devolve null em escola conceitual sem rótulo, que não tem campo a mostrar', () => {
    expect(
      modeloAvaliacaoDaEscola(
        escola({ modeloAvaliacao: { tipoEscala: 'CPS_ETEC', nivelEscalas: [] } }),
      ),
    ).toBeNull()
  })

  it('aceita escola numérica sem níveis, que é como a escala de 1 a 10 vem', () => {
    const modelo = modeloAvaliacaoDaEscola(
      escola({ modeloAvaliacao: { tipoEscala: 'NUMERICA', nivelEscalas: [] } }),
    )

    expect(modelo).toEqual(MODELO_NUMERICO)
    expect(ehEscalaNumerica(modelo!)).toBe(true)
  })
})

describe('validarValorNoModelo', () => {
  it('aceita os rótulos do modelo conceitual', () => {
    for (const rotulo of MODELO_CPS_ETEC.rotulos) {
      expect(validarValorNoModelo(MODELO_CPS_ETEC, rotulo)).toEqual({ valido: true })
    }
  })

  it('recusa rótulo que não está na escala, como o backend faz com 400', () => {
    expect(validarValorNoModelo(MODELO_CPS_ETEC, 'X').erro).toBe(
      'Escolha um destes rótulos: I, R, B, MB.',
    )
  })

  it('recusa número no modelo conceitual', () => {
    expect(validarValorNoModelo(MODELO_CPS_ETEC, '8.5').valido).toBe(false)
  })

  it('aceita número de 1 a 10 no modelo numérico', () => {
    expect(validarValorNoModelo(MODELO_NUMERICO, '1')).toEqual({ valido: true })
    expect(validarValorNoModelo(MODELO_NUMERICO, '8.5')).toEqual({ valido: true })
    expect(validarValorNoModelo(MODELO_NUMERICO, '10')).toEqual({ valido: true })
  })

  it('recusa o que o REGEX_NUMERICO do backend recusa', () => {
    for (const invalido of ['0', '11', '8,5', '8.567', 'X']) {
      expect(validarValorNoModelo(MODELO_NUMERICO, invalido).valido).toBe(false)
    }
  })

  it('exige a nota preenchida', () => {
    expect(validarValorNoModelo(MODELO_NUMERICO, '  ').erro).toBe('Informe a nota.')
  })
})
