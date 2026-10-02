import {
  ESCALA_DE_PONTUACAO,
  descreverEscala,
  formatarPontuacao,
  MAXIMO_DA_PONTUACAO_FINAL_DO_GRUPO,
  MAXIMO_DA_SINTESE_BIMESTRAL,
  rotuloCurtoDoBimestre,
} from './relatorios.tipos'

/**
 * A separação das escalas é o requisito que a Etapa 10 chama de "visualmente
 * separado", e ela é garantida em dois lugares: no **formatador**, que escreve o
 * número igual nas três escalas (a separação é do rótulo, não do número), e na
 * **tabela de escalas**, que é de onde o rótulo e o teto saem. Estes testes
 * fixam os dois, porque um formatador que dividisse por 4 na escala da soma
 * devolveria um número que "cabe" em 0 a 10 — e a mistura voltaria a ser possível
 * justamente por parecer innocent.
 */
describe('escalas de pontuação', () => {
  it('distingue a síntese, a média do aluno e a soma do grupo', () => {
    const sintese = descreverEscala(ESCALA_DE_PONTUACAO.SINTESE_BIMESTRAL)
    const media = descreverEscala(ESCALA_DE_PONTUACAO.MEDIA_BIMESTRAL)
    const soma = descreverEscala(ESCALA_DE_PONTUACAO.SOMA_BIMESTRAL)

    expect(sintese.maximo).toBe(10)
    expect(media.maximo).toBe(10)
    // Só a soma passa de 10, e é o teto de 40 que impede que ela seja lida como nota.
    expect(soma.maximo).toBe(40)
    expect(soma.maximo).toBe(MAXIMO_DA_PONTUACAO_FINAL_DO_GRUPO)
    expect(sintese.maximo).toBe(MAXIMO_DA_SINTESE_BIMESTRAL)

    // Os nomes são distintos de propósito: são eles que dizem, na tela, o que o
    // número é. Duas escalas com o mesmo nome não separariam nada.
    expect(new Set([sintese.titulo, media.titulo, soma.titulo]).size).toBe(3)
    expect(soma.explicacao).toContain('0 a 40')
  })

  it('formata o mesmo número nas três escalas, sem converter', () => {
    const valor = 31.8

    expect(formatarPontuacao(valor)).toBe('31.80')
    expect(formatarPontuacao(valor)).toBe(formatarPontuacao(31.8))
  })

  it('escreve 31.80 acima do teto da escala da síntese, e é isso que o rótulo impede', () => {
    // A soma do grupo é um valor impossível na escala da síntese. O formatador não
    // pode "corrigir" isso — ele escreve o que a API mandou, e quem impede a leitura
    // errada é o bloco que carrega o nome da escala e o teto.
    const somaDoGrupo = 8.25 + 7.5 + 6 + 7.75
    expect(somaDoGrupo).toBeCloseTo(29.5)

    expect(formatarPontuacao(somaDoGrupo)).toBe('29.50')
    expect(Number(formatarPontuacao(somaDoGrupo))).toBeGreaterThan(
      descreverEscala(ESCALA_DE_PONTUACAO.SINTESE_BIMESTRAL).maximo,
    )
  })

  it('escreve traço, e não zero, para bimestre sem síntese', () => {
    expect(formatarPontuacao(null)).toBe('—')
    expect(formatarPontuacao(0)).toBe('0.00')
  })

  it('mantém as duas casas decimais que vêm do backend', () => {
    expect(formatarPontuacao(7.5)).toBe('7.50')
    expect(formatarPontuacao(8)).toBe('8.00')
  })
})

describe('rotuloCurtoDoBimestre', () => {
  it('escreve o mesmo rótulo no eixo, na tabela e nas parcelas', () => {
    expect(rotuloCurtoDoBimestre(1)).toBe('1º')
    expect(rotuloCurtoDoBimestre(4)).toBe('4º')
  })
})