import { describe, expect, it } from 'vitest'
import {
  ordemDoDesempate,
  posicaoDoBlocoEmpatado,
  posicaoRepetida,
  posicoesIniciaisDoDesempate,
  rotuloDoEscopoDoDesempate,
} from './desempate'
import { TIPO_EMPATE } from './desempate.tipos'
import type { GrupoEmpatado } from './encerramento.tipos'
import type { Bimestre } from './competicoes.tipos'
import type { ItemDeGrupo } from '../rankings/rankings.tipos'
import type { PendenciaDeDesempate } from './desempate.tipos'

/*
 * A Etapa 09 tem uma conta que a tela não pode fazer errado e que nenhum clique
 * denuncia: a posição que um grupo empatado ocupa hoje.
 *
 * A API grava a posição que o professor escolheu, e o ranking *troca* a posição do
 * grupo por ela. Então oferecer "1º e 2º" para duas equipes empatadas em 3º e 4º
 * não é um detalhe de exibição: gravaria as posições erradas e jogaria a tabela
 * para o topo. Estes testes existem para travar essa regra no lugar onde ela é
 * escrita, e o "onde está escrito" são quatro funções puras.
 */

const ALFA: Pick<GrupoEmpatado, 'grupoId'> = { grupoId: 'g1' }
const BETA: Pick<GrupoEmpatado, 'grupoId'> = { grupoId: 'g2' }
const GAMA: Pick<GrupoEmpatado, 'grupoId'> = { grupoId: 'g3' }

/** Os quatro bimestres, para o rótulo do escopo ter de onde tirar o número. */
const BIMESTRES: Bimestre[] = [1, 2, 3, 4].map((numero) => ({
  id: `b${numero}`,
  competicaoId: 'comp-1',
  numero,
  dataInicio: '2026-02-01T00:00:00.000Z',
  dataFim: '2026-04-30T00:00:00.000Z',
  situacao: 'ABERTO',
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
}))

/** Linha de ranking, com o que a posição e o empate dependem. */
function linha(
  grupoId: string,
  posicao: number,
  valor: number,
  empate = false,
): ItemDeGrupo {
  return { grupoId, nome: grupoId, posicao, valor, empate }
}

describe('posição do bloco empatado', () => {
  it('devolve a posição que o ranking repete no bloco', () => {
    const itens = [linha('g1', 1, 90), linha('g2', 2, 80), linha('g3', 2, 80), linha('g4', 4, 70)]

    expect(posicaoDoBlocoEmpatado(itens, [GAMA, BETA])).toBe(2)
  })

  it('devolve o começo do bloco quando três equipes empatam em 3º lugar', () => {
    /*
     * O caso que mais importa para a tela: três equipes no mesmo lugar precisam
     * receber 3º, 4º e 5º — e o começo do bloco é a posição que o ranking repete
     * nas três linhas.
     */
    const itens = [
      linha('g1', 1, 95),
      linha('g2', 2, 90),
      linha('g3', 3, 85),
      linha('g4', 3, 85),
      linha('g5', 3, 85),
    ]

    expect(posicaoDoBlocoEmpatado(itens, [{ grupoId: 'g3' }, { grupoId: 'g4' }, { grupoId: 'g5' }])).toBe(3)
  })

  it('ignora as equipes que não estão no empate informado', () => {
    /*
     * O empate pedido não começa no topo da tabela: uma equipe acima dele, sozinha,
     * não pode virar a posição-base. É o que separa "a posição de uma linha" de
     * "a primeira posição que a implementação achou".
     */
    const itens = [linha('g1', 1, 95), linha('g2', 2, 80), linha('g3', 2, 80)]

    expect(posicaoDoBlocoEmpatado(itens, [BETA, GAMA])).toBe(2)
  })

  it('devolve null quando o ranking não traz nenhuma das equipes', () => {
    expect(posicaoDoBlocoEmpatado([linha('g9', 1, 90)], [ALFA, BETA])).toBeNull()
  })

  it('funciona com o ranking vazio, que é o caso de um escopo sem linha ainda', () => {
    expect(posicaoDoBlocoEmpatado([], [ALFA])).toBeNull()
  })
})

describe('posições iniciais', () => {
  it('distribui o bloco a partir da posição dele, sem ir a 1º', () => {
    expect(posicoesIniciaisDoDesempate([ALFA, BETA], 3)).toEqual({ g1: 3, g2: 4 })
  })

  it('dá posições distintas para três equipes empatadas', () => {
    const posicoes = posicoesIniciaisDoDesempate([ALFA, BETA, GAMA], 5)

    expect(Object.values(posicoes)).toEqual([5, 6, 7])
    expect(posicaoRepetida(posicoes)).toBe(false)
  })
})

describe('ordem enviada à API', () => {
  it('ordena pela posição escolhida, e não pela ordem em que os nomes vieram', () => {
    /*
     * A API entrega os grupos de um empate ordenados pelo nome, e o corpo vai com
     * a ordem do ranking. Mandar na ordem alfabética gravaria as posições certas
     * — a API ordena por `posicao`, não pelo lugar no array — mas mandaria um
     * payload que não descreve a ordem que o professor acabou de montar.
     */
    const ordem = ordemDoDesempate([GAMA, BETA], { g3: 4, g2: 3 })

    expect(ordem).toEqual([
      { grupoId: 'g2', posicao: 3 },
      { grupoId: 'g3', posicao: 4 },
    ])
  })

  it('deixa de fora a equipe sem posição escolhida', () => {
    const ordem = ordemDoDesempate([ALFA, BETA], { g1: 2 })

    expect(ordem).toEqual([{ grupoId: 'g1', posicao: 2 }])
  })
})

describe('posição repetida', () => {
  it('reconhece duas equipes na mesma posição, que a API recusa com 400', () => {
    expect(posicaoRepetida({ g1: 3, g2: 3 })).toBe(true)
  })

  it('aceita a ordem que o professor montou', () => {
    expect(posicaoRepetida({ g1: 3, g2: 4 })).toBe(false)
  })
})

describe('rótulo do escopo', () => {
  it('nomeia o bimestre do desempate parcial', () => {
    const pendencia: Pick<PendenciaDeDesempate, 'bimestreId'> = { bimestreId: 'b2' }

    expect(rotuloDoEscopoDoDesempate(pendencia, BIMESTRES)).toBe('2º Bimestre')
  })

  it('trata bimestreId nulo como ranking anual', () => {
    const pendencia: Pick<PendenciaDeDesempate, 'bimestreId'> = { bimestreId: null }

    expect(rotuloDoEscopoDoDesempate(pendencia, BIMESTRES)).toBe('ranking anual')
  })

  it('não inventa o número quando o bimestre não está na lista da competição', () => {
    const pendencia: Pick<PendenciaDeDesempate, 'bimestreId'> = { bimestreId: 'b9' }

    expect(rotuloDoEscopoDoDesempate(pendencia, BIMESTRES)).toBe('ranking parcial')
  })

  it('distingue o parcial do anual pelo tipo que a API devolveu', () => {
    /*
     * `tipo` e `bimestreId` chegam juntos da API e são coerentes por construção
     * (`bimestreId ? 'parcial' : 'anual'`); o teste fixa essa coerência para que
     * uma refatoração dos tipos não permita um "anual do 2º bimestre".
     */
    const parcial: PendenciaDeDesempate = {
      tipo: TIPO_EMPATE.PARCIAL,
      bimestreId: 'b1',
      valor: 8.2,
      grupos: [ALFA as GrupoEmpatado, BETA as GrupoEmpatado],
    }

    expect(rotuloDoEscopoDoDesempate(parcial, BIMESTRES)).toBe('1º Bimestre')
  })
})