/**
 * Cálculos da tela de desempate, fora do componente.
 *
 * Moram aqui as três contas que o formulário faz e que são difíceis de conferir
 * por clique no `DesempateForm`:
 *
 * 1. **Em que posição do ranking está o bloco empatado.** É a parte que não pode
 *    ser inventada: a API grava a posição que o professor escolheu e o ranking
 *    **troca** a posição do grupo por ela (`RankingsService.aplicarDesempates`),
 *    então oferecer "1º e 2º" para duas equipes empatadas em 3º e 4º lugar
 *    mandaria a tabela para o topo. A posição vem do ranking do escopo, e a
 *    posição que ele repete para os empatados é a do bloco.
 * 2. **A ordem que vai no corpo do `POST`.** Sai ordenada pela posição, para que o
 *    payload seja a ordem do ranking e não a ordem alfabética em que a API
 *    entregou os grupos.
 * 3. **O texto do escopo.** O desempate do bimestre e o do ranking anual precisam
 *    se anunciar de formas diferentes, e é aqui que o `bimestreId: null` vira
 *    "ranking anual" em vez de um espaço em branco.
 */

import { rotuloDoBimestre } from './bimestres'
import type { GrupoEmpatado } from './encerramento.tipos'
import type { Bimestre } from './competicoes.tipos'
import type { OrdemDeDesempate, PendenciaDeDesempate } from './desempate.tipos'
import type { ItemDeGrupo } from '../rankings/rankings.tipos'

/** Rótulo do escopo de um desempate, como o professor vai lê-lo. */
export function rotuloDoEscopoDoDesempate(
  pendencia: Pick<PendenciaDeDesempate, 'bimestreId'>,
  bimestres: Bimestre[],
): string {
  if (pendencia.bimestreId === null) return 'ranking anual'

  const numero = bimestres.find((bimestre) => bimestre.id === pendencia.bimestreId)?.numero

  // O bimestre deveria estar na lista da competição que abriu o desempate; o
  // fallback existe para o caso de a tela ser montada com uma lista incompleta,
  // onde dizer "ranking parcial" ainda é verdadeiro e um "undefined" não seria.
  return numero === undefined ? 'ranking parcial' : rotuloDoBimestre(numero)
}

/**
 * A posição do primeiro lugar do bloco empatado no ranking do escopo.
 *
 * Sai da linha do próprio ranking, e não de uma contagem de quantas equipes
 * pontuaram acima: no ranking de um empate a API repete a posição em todas as
 * linhas do bloco, então a posição da linha de qualquer uma das equipes é
 * exatamente o início do bloco — e esse caminho não depende de comparar ponto
 * flutuante nem de saber quantas equipes havia no escopo.
 *
 * `null` quando o ranking veio sem nenhuma das equipes. Aí a tela não monta os
 * seletores: sem a posição do bloco não há posição válida para oferecer, e um
 * seletor começando em 1º sem saber o que ele significa gravaria posições que
 * jogam o ranking para o topo.
 */
export function posicaoDoBlocoEmpatado(
  itens: readonly ItemDeGrupo[],
  grupos: ReadonlyArray<Pick<GrupoEmpatado, 'grupoId'>>,
): number | null {
  const doEmpatado = new Set(grupos.map((grupo) => grupo.grupoId))

  for (const item of itens) {
    if (doEmpatado.has(item.grupoId)) return item.posicao
  }

  return null
}

/**
 * A ordem inicial dos seletores: a ordem em que a API entregou os grupos.
 *
 * O `DesempateService` devolve os grupos de um empate ordenados pelo nome, e
 * essa é a única ordem que não afirma uma preferência que ninguém tem: enquanto
 * o desempate não está gravado, as equipes empatadas realmente não têm ordem
 * definida, e oferecer já uma ordem vencedora seria o front decidindo o
 * desempate que cabe ao professor.
 */
export function posicoesIniciaisDoDesempate(
  grupos: ReadonlyArray<Pick<GrupoEmpatado, 'grupoId'>>,
  posicaoInicial: number,
): Record<string, number> {
  return Object.fromEntries(grupos.map((grupo, indice) => [grupo.grupoId, posicaoInicial + indice]))
}

/**
 * O corpo da resolução: a mesma lista, ordenada pela posição escolhida.
 *
 * A API valida a ordem (sem repetir grupo nem posição) e grava as posições como
 * vieram — a ordem do array não muda nada no que é gravado, mas mandá-la em ordem
 * de ranking deixa o payload legível e o teste do que foi enviado conferível
 * linha a linha.
 */
export function ordemDoDesempate(
  grupos: ReadonlyArray<Pick<GrupoEmpatado, 'grupoId'>>,
  posicoes: Record<string, number>,
): OrdemDeDesempate[] {
  // O filtro vem antes do `map` de propósito: uma equipe sem posição escolhida
  // não entra no corpo, e `Number.isFinite` sobre o resultado do `map` deixaria o
  // tipo como `number | undefined` para o `.sort` logo abaixo.
  return grupos
    .map((grupo) => ({ grupoId: grupo.grupoId, posicao: posicoes[grupo.grupoId] }))
    .filter((ordem): ordem is OrdemDeDesempate => ordem.posicao !== undefined)
    .sort((a, b) => a.posicao - b.posicao)
}

/**
 * `true` quando duas equipes foram colocadas na mesma posição.
 *
 * A API recusa com 400 ("As posições do desempate devem ser únicas"), e a tela
 * não deixa o envio chegar lá: o botão de salvar é desabilitado e o aviso
 * aparece enquanto a ordem estiver inválida. Deixar o erro vir do servidor seria
 * fazer o professor descobrir uma regra que a tela poderia ter mostrado antes.
 */
export function posicaoRepetida(posicoes: Record<string, number>): boolean {
  const valores = Object.values(posicoes)

  return new Set(valores).size !== valores.length
}