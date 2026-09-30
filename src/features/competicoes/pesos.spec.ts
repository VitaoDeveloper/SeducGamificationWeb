import { avaliarPesos, formatarPercentual, rotuloDoPeso, validarPesoPercentual } from './pesos'
import type { ComponenteComPeso } from './pesos'

/** Componente no formato mínimo que `avaliarPesos` consome. */
function componente(nome: string, pesoPercentual: number): ComponenteComPeso {
  return { nome, pesoPercentual }
}

describe('avaliarPesos', () => {
  it('fecha a matéria cuja soma é 100%', () => {
    const avaliacao = avaliarPesos([componente('Prova 1', 30), componente('Prova 2', 70)])

    expect(avaliacao).toEqual({ total: 100, fechou: true, falta: 0 })
  })

  it('diz quanto falta quando a soma é menor que 100%', () => {
    const avaliacao = avaliarPesos([componente('Redação', 40)])

    expect(avaliacao).toEqual({ total: 40, fechou: false, falta: 60 })
  })

  it('trata a matéria sem nenhum componente como faltando 100%', () => {
    expect(avaliarPesos([])).toEqual({ total: 0, fechou: false, falta: 100 })
  })

  it('fecha em três partes que somam 100 em ponto flutuante', () => {
    // 33.33 + 33.33 + 33.34 dá 100.00000000000001: sem arredondar, a matéria
    // apareceria como pendente e o professor procuraria um peso que não existe.
    const avaliacao = avaliarPesos([
      componente('Parte 1', 33.33),
      componente('Parte 2', 33.33),
      componente('Parte 3', 33.34),
    ])

    expect(avaliacao).toEqual({ total: 100, fechou: true, falta: 0 })
  })
})

describe('rotuloDoPeso', () => {
  it('anuncia o fechamento com os 100% e o visto', () => {
    expect(rotuloDoPeso(avaliarPesos([componente('Prova', 100)]))).toBe('100% ✓')
  })

  it('anuncia quanto falta quando a matéria não fechou', () => {
    expect(rotuloDoPeso(avaliarPesos([componente('Prova', 25)]))).toBe('faltam 75%')
  })
})

describe('formatarPercentual', () => {
  it('esconde as casas decimais quando o peso é inteiro', () => {
    expect(formatarPercentual(60)).toBe('60%')
  })

  it('mantém as duas casas quando o peso tem decimais', () => {
    expect(formatarPercentual(33.33)).toBe('33.33%')
  })
})

describe('validarPesoPercentual', () => {
  it('aceita o peso que a API aceita e devolve o número', () => {
    expect(validarPesoPercentual('30')).toEqual({ valor: 30 })
    expect(validarPesoPercentual('12.5')).toEqual({ valor: 12.5 })
    expect(validarPesoPercentual('100')).toEqual({ valor: 100 })
  })

  it('exige o peso preenchido', () => {
    expect(validarPesoPercentual('   ')).toEqual({ erro: 'Informe o peso percentual.' })
  })

  it('recusa texto e vírgula decimal, que o Number do DTO não entende', () => {
    expect(validarPesoPercentual('abc').erro).toMatch(/número, com ponto decimal/)
    expect(validarPesoPercentual('12,5').erro).toMatch(/número, com ponto decimal/)
  })

  it('recusa mais de 2 casas decimais, como o maxDecimalPlaces do DTO', () => {
    expect(validarPesoPercentual('12.567').erro).toMatch(/2 casas decimais/)
  })

  it('recusa peso zero, que o Min(0.01) do DTO barra', () => {
    expect(validarPesoPercentual('0').erro).toBe('O peso precisa ser maior que zero.')
  })

  it('recusa peso acima de 100%', () => {
    expect(validarPesoPercentual('101').erro).toBe('O peso não pode passar de 100%.')
  })
})
