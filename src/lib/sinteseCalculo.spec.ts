import { describe, expect, it } from 'vitest'
import {
  arredondarParaDuasCasas,
  converterNotaParaNumero,
  formatarSintese,
  sinteseBimestralDoAluno,
  sinteseBimestralDoGrupo,
  sinteseDaMateria,
} from './sinteseCalculo'
import type { EscalaParaCalculo } from './sinteseCalculo'

/*
 * Os números aqui são os do `docs/03-regras-de-calculo.md` da API (seção 9) e os
 * casos do `sintese-calculo.service.spec.ts` do backend. São a referência
 * obrigatória da Etapa 06: se este arquivo e o do backend divergirem, a prévia da
 * tela deixa de bater com o valor gravado no encerramento.
 */

const ESCALA_NUMERICA: EscalaParaCalculo = { tipoEscala: 'NUMERICA', niveis: [] }

const ESCOLA_ETEC: EscalaParaCalculo = {
  tipoEscala: 'CPS_ETEC',
  niveis: [
    { rotulo: 'I', valorNumerico: 3 },
    { rotulo: 'R', valorNumerico: 5 },
    { rotulo: 'B', valorNumerico: 8 },
    { rotulo: 'MB', valorNumerico: 10 },
  ],
}

/** Pesos 50/20/30 do doc 03, o exemplo que ele usa em todos os exemplos. */
const PESOS_50_20_30 = { prova: 50, caderno: 20, projeto: 30 }

describe('sinteseCalculo', () => {
  describe('arredondarParaDuasCasas', () => {
    it('arredonda para duas casas', () => {
      expect(arredondarParaDuasCasas(8.26666)).toBe(8.27)
      expect(arredondarParaDuasCasas(7.8)).toBe(7.8)
    })

    /*
     * O empate de meia casa é o motivo de o utilitário usar `toFixed(2)` e não
     * `Math.round(valor * 100) / 100`. É o caso que a prévia erraria, e erraria
     * justamente onde o ranking decide o campeão: nos 0,01 que separam dois
     * grupos.
     */
    it('no empate de meia casa arredonda como o backend, não como o Math.round', () => {
      // Notas 1, 1 e 5.25 com pesos 50/20/30 dão 2.275 na conta bruta.
      const bruta = 1 * 0.5 + 1 * 0.2 + 5.25 * 0.3
      expect(bruta).toBe(2.275)

      expect(arredondarParaDuasCasas(bruta)).toBe(2.27)
      // A conta que o front não pode fazer, porque diverge do backend em 0,01.
      expect(Math.round(bruta * 100) / 100).toBe(2.28)
    })
  })

  describe('converterNotaParaNumero', () => {
    it('no modelo numérico converte o valor direto', () => {
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '8.5')).toBe(8.5)
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '10')).toBe(10)
    })

    it('no CPS ETEC converte o conceito pelo valor numérico do nível', () => {
      expect(converterNotaParaNumero(ESCOLA_ETEC, 'I')).toBe(3)
      expect(converterNotaParaNumero(ESCOLA_ETEC, 'R')).toBe(5)
      expect(converterNotaParaNumero(ESCOLA_ETEC, 'B')).toBe(8)
      expect(converterNotaParaNumero(ESCOLA_ETEC, 'MB')).toBe(10)
    })

    it('rótulo fora da escala vale 0, como no backend', () => {
      expect(converterNotaParaNumero(ESCOLA_ETEC, 'ZZ')).toBe(0)
    })

    /*
     * A prévia é recalculada a cada tecla. O backend só recebe o que passou na
     * validação do modelo — `parseFloat('8,5')` no lado dele também daria 8, mas
     * o `LancamentosService` recusa o lançamento com 400 antes disso. Um `NaN`,
     * porém, viraria "8,5abc" — e aí contaminaria a síntese da matéria inteira,
     * então texto sem número nenhum vira 0.
     *
     * O texto que é meio número ("8,5", "11") é problema da tela, não da conta: o
     * `previa-sintese` não entrega entrada que não passou em
     * `validarValorNoModelo`.
     */
    it('texto que não é número vale 0 em vez de contaminar a conta com NaN', () => {
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '')).toBe(0)
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '   ')).toBe(0)
      expect(converterNotaParaNumero(ESCALA_NUMERICA, 'abc')).toBe(0)
      expect(Number.isNaN(converterNotaParaNumero(ESCALA_NUMERICA, 'abc'))).toBe(false)
    })

    it('parcialmente numérico segue o parseFloat do backend', () => {
      // 8,5 vira 8, e é por isso que a validação do modelo vem antes da conta.
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '8,5')).toBe(8)
      expect(converterNotaParaNumero(ESCALA_NUMERICA, '8.5abc')).toBe(8.5)
    })
  })

  describe('sinteseDaMateria', () => {
    it('pesos 50/20/30 com notas 8/10/6 produz 7.8 (doc 03, exemplo 1)', () => {
      expect(
        sinteseDaMateria(
          [
            { valorNoModelo: '8', pesoPercentual: PESOS_50_20_30.prova },
            { valorNoModelo: '10', pesoPercentual: PESOS_50_20_30.caderno },
            { valorNoModelo: '6', pesoPercentual: PESOS_50_20_30.projeto },
          ],
          ESCALA_NUMERICA,
        ),
      ).toBe(7.8)
    })

    it('os mesmos pesos em CPS ETEC com B/MB/R produz 7.5 (doc 03, exemplo 2)', () => {
      expect(
        sinteseDaMateria(
          [
            { valorNoModelo: 'B', pesoPercentual: PESOS_50_20_30.prova },
            { valorNoModelo: 'MB', pesoPercentual: PESOS_50_20_30.caderno },
            { valorNoModelo: 'R', pesoPercentual: PESOS_50_20_30.projeto },
          ],
          ESCOLA_ETEC,
        ),
      ).toBe(7.5)
    })

    /*
     * Componente sem lançamento vale 0 **sem sair da lista**: o peso dele
     * continua contando. O mesmo caso do spec do backend, 5.8.
     */
    it('componente sem lançamento entra como nota 0, mantendo o peso', () => {
      expect(
        sinteseDaMateria(
          [
            { valorNoModelo: '8', pesoPercentual: PESOS_50_20_30.prova },
            { pesoPercentual: PESOS_50_20_30.caderno },
            { valorNoModelo: '6', pesoPercentual: PESOS_50_20_30.projeto },
          ],
          ESCALA_NUMERICA,
        ),
      ).toBe(5.8)
    })

    it('matéria sem componente nenhum vale 0', () => {
      expect(sinteseDaMateria([], ESCALA_NUMERICA)).toBe(0)
    })

    it('arredonda o resultado em duas casas', () => {
      expect(
        sinteseDaMateria(
          [
            { valorNoModelo: '8.2', pesoPercentual: 50 },
            { valorNoModelo: '8.4', pesoPercentual: 50 },
          ],
          ESCALA_NUMERICA,
        ),
      ).toBe(8.3)
    })

    /*
     * A ordem da soma não é detalhe de leitura. Notas 1, 1 e 5,25 com pesos
     * 50/20/30 dão as mesmas parcelas em qualquer ordem, mas o empacotamento em
     * ponto flutuante não é associativo e o resultado muda de centésimo:
     *
     *   por nome  (ordem em que a API entrega os componentes): 2,27
     *   por peso  (ordem em que o encerramento soma):            2,28
     *
     * O encerramento pede `pesoPercentual desc, id asc` ao banco
     * (`carregarComponentesDoBimestre`), e é ele quem grava a síntese. Somar na
     * ordem da entrega faria a prévia mostrar 2,27 e o banco gravar 2,28 — no
     * centésimo que separa dois grupos no ranking.
     */
    it('soma na ordem do encerramento (peso desc), não na ordem da entrega', () => {
      expect(
        sinteseDaMateria(
          [
            { valorNoModelo: '1', pesoPercentual: PESOS_50_20_30.prova },
            { valorNoModelo: '1', pesoPercentual: PESOS_50_20_30.caderno },
            { valorNoModelo: '5.25', pesoPercentual: PESOS_50_20_30.projeto },
          ],
          ESCALA_NUMERICA,
        ),
      ).toBe(2.28)
    })

    it('no empate de peso, desempata pelo id do componente, como o banco', () => {
      // Três componentes com o mesmo peso: o desempate do `orderBy` do backend é
      // `id asc`, e é ele que fixa o empacotamento da soma. Notas 0,25, 0,5 e
      // 1,5 dão 0,68 nessa ordem e 0,67 invertida — mesmo peso, mesmo centésimo
      // diferente. A ordem da entrada não pode decidir isso, e o nome do
      // componente também não serve, porque o banco não ordena por nome.
      const porId = sinteseDaMateria(
        [
          { valorNoModelo: '0.25', pesoPercentual: 30, componenteId: 'cp-a' },
          { valorNoModelo: '0.5', pesoPercentual: 30, componenteId: 'cp-b' },
          { valorNoModelo: '1.5', pesoPercentual: 30, componenteId: 'cp-c' },
        ],
        ESCALA_NUMERICA,
      )
      const invertido = sinteseDaMateria(
        [
          { valorNoModelo: '0.25', pesoPercentual: 30, componenteId: 'cp-c' },
          { valorNoModelo: '0.5', pesoPercentual: 30, componenteId: 'cp-b' },
          { valorNoModelo: '1.5', pesoPercentual: 30, componenteId: 'cp-a' },
        ],
        ESCALA_NUMERICA,
      )

      expect(porId).toBe(0.68)
      expect(invertido).toBe(0.67)
    })
  })

  describe('sinteseBimestralDoAluno', () => {
    it('média das matérias 7.8 e 8.6 produz 8.2 (doc 03, exemplo 1)', () => {
      expect(sinteseBimestralDoAluno([7.8, 8.6])).toBe(8.2)
    })

    it('lista vazia produz 0', () => {
      expect(sinteseBimestralDoAluno([])).toBe(0)
    })

    it('é média simples, sem ponderar as matérias', () => {
      // Duas matérias de 10 e uma de 2: a média ponderada daria 7.33.
      expect(sinteseBimestralDoAluno([10, 10, 2])).toBe(7.33)
    })

    /*
     * Matéria sem componente é 0 no numerador **e** no denominador. É o que
     * `calcularSintesesDosAlunos` monta: uma entrada por componente curricular
     * do lecionamento. Sem contar a matéria vazia, a prévia de um bimestre em
     * que o professor ainda não configurou uma matéria/showia uma nota maior do
     * que a que será gravada.
     */
    it('conta a matéria sem componente no denominador', () => {
      expect(sinteseBimestralDoAluno([10, 0])).toBe(5)
    })
  })

  describe('sinteseBimestralDoGrupo', () => {
    it('integrantes 8.2/7.5/9.1 produz 8.27 (doc 03, exemplo 3, dízima)', () => {
      expect(sinteseBimestralDoGrupo([8.2, 7.5, 9.1])).toBe(8.27)
    })

    it('lista vazia produz 0', () => {
      expect(sinteseBimestralDoGrupo([])).toBe(0)
    })
  })

  describe('formatarSintese', () => {
    it('mostra sempre duas casas, com ponto', () => {
      expect(formatarSintese(8.2)).toBe('8.20')
      expect(formatarSintese(8.27)).toBe('8.27')
      expect(formatarSintese(0)).toBe('0.00')
    })
  })
})
