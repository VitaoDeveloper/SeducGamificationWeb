import {
  MODELO_CPS_ETEC,
  MODELO_NUMERICO,
  ehEscalaNumerica,
  modeloAvaliacaoDaEscola,
  validarValorNoModelo,
} from './modelo-avaliacao'
import { ESCOLA_A } from '../../test/handlers'

describe('modeloAvaliacaoDaEscola', () => {
  it('devolve o modelo conceitual enquanto a API não expõe o da escola', () => {
    const modelo = modeloAvaliacaoDaEscola(ESCOLA_A)

    expect(ehEscalaNumerica(modelo)).toBe(false)
    expect(modelo.rotulos).toEqual(['I', 'R', 'B', 'MB'])
  })

  it('não quebra quando a sala da competição ainda não chegou', () => {
    expect(ehEscalaNumerica(modeloAvaliacaoDaEscola(undefined))).toBe(false)
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
