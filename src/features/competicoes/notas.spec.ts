import { validarNotas } from './notas'
import { MODELO_CPS_ETEC, MODELO_NUMERICO } from '../../test/modelos-de-avaliacao'

describe('validarNotas', () => {
  it('monta o lote só com os campos preenchidos', () => {
    const validacao = validarNotas(
      [
        { alunoId: 'a1', valor: 'MB' },
        { alunoId: 'a2', valor: '' },
        { alunoId: 'a3', valor: 'R' },
      ],
      MODELO_CPS_ETEC,
    )

    expect(validacao.lancamentos).toEqual([
      { alunoId: 'a1', valorNoModelo: 'MB' },
      { alunoId: 'a3', valorNoModelo: 'R' },
    ])
    expect(validacao.preenchidas).toBe(2)
    expect(validacao.valido).toBe(true)
  })

  it('apaga o espaço em volta do valor, que o banco não quer', () => {
    const validacao = validarNotas([{ alunoId: 'a1', valor: ' 8.5 ' }], MODELO_NUMERICO)

    expect(validacao.lancamentos).toEqual([{ alunoId: 'a1', valorNoModelo: '8.5' }])
  })

  it('devolve um lote vazio quando ninguém preencheu nada', () => {
    const validacao = validarNotas(
      [
        { alunoId: 'a1', valor: '  ' },
        { alunoId: 'a2', valor: '' },
      ],
      MODELO_CPS_ETEC,
    )

    expect(validacao.lancamentos).toEqual([])
    expect(validacao.preenchidas).toBe(0)
    expect(validacao.valido).toBe(true)
  })

  it('trava o envio e aponta o aluno quando a nota está fora do modelo', () => {
    const validacao = validarNotas(
      [
        { alunoId: 'a1', valor: 'MB' },
        { alunoId: 'a2', valor: '8.5' },
      ],
      MODELO_CPS_ETEC,
    )

    expect(validacao.valido).toBe(false)
    expect(validacao.erros).toEqual([
      { alunoId: 'a2', erro: 'Escolha um destes rótulos: I, R, B, MB.' },
    ])
    // A nota certa continua montada: o erro é no envio, não no que o professor digitou.
    expect(validacao.lancamentos).toEqual([{ alunoId: 'a1', valorNoModelo: 'MB' }])
  })

  it('recusa nota fora de 1 a 10 no modelo numérico', () => {
    const validacao = validarNotas([{ alunoId: 'a1', valor: '11' }], MODELO_NUMERICO)

    expect(validacao.valido).toBe(false)
    expect(validacao.erros[0]?.erro).toBe('A nota precisa estar entre 1 e 10.')
  })
})
