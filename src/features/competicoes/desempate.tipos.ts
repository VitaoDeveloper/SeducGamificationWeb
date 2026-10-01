/**
 * Formas de dado da Etapa 09 (desempate).
 *
 * Espelham o que o `DesempateService` do NestJS serializa (`README-API.md`,
 * seção 11.12): `GET /competicoes/:id/desempate/pendencias`, `POST
 * /competicoes/:id/desempate` e `POST .../desempate/aplicar-automatico`.
 *
 * Quatro coisas do contrato merecem ficar escritas aqui, porque são elas que
 * moldam a tela:
 *
 * 1. **`bimestreId: null` é o ranking anual, não "sem escopo".** A API usa o
 *    mesmo campo para as duas coisas: presente, o desempate é do ranking parcial
 *    daquele bimestre; ausente ou `null`, é do anual, que soma as sínteses dos
 *    bimestres encerrados. A tela nunca monta um corpo sem `bimestreId` — manda
 *    `null` explícito, que é o que a API documenta como "anual" — porque um
 *    campo faltando e um campo nulo são a mesma coisa para o backend e não
 *    precisam ser a mesma coisa para o código que lê.
 * 2. **A pendência não traz a posição do bloco.** `GET .../pendencias` devolve
 *    `tipo`, `bimestreId`, `valor` e `grupos` — e a posição do bloco empatado
 *    (o `1` de um `1, 1, 3`) fica de fora, embora o backend a calcule por dentro
 *    para o critério automático. É a lacuna que obriga a tela a ler o ranking do
 *    escopo para descobrir onde o bloco está; ver `posicaoDoBlocoEmpatado` em
 *    `DesempateForm.tsx`.
 * 3. **A posição gravada substitui a do ranking.** `GET .../ranking` não ordena
 *    o desempate à parte: ele troca a posição do grupo e a lista é reordenada por
 *    ela (`RankingsService.aplicarDesempates`). Por isso o que a tela oferece ao
 *    professor não é "ordem relativa" (1º, 2º entre os empatados) e sim a posição
 *    que cada equipe vai ocupar no ranking — o que, num bloco que começa na 3ª,
 *    é 3ª e 4ª, e não 1ª e 2ª.
 * 4. **`residuais` não é erro.** O critério automático (RN25/RN26) pode terminar
 *    empatado de verdade, quando as equipes são iguais em todas as matérias: a
 *    API não grava nada nesse caso e devolve o empate em `residuais`. Quem
 *    precisa decidir ali é o professor, manualmente.
 */

import type { GrupoEmpatado } from './encerramento.tipos'

/**
 * O escopo do empate: parcial (de um bimestre) ou anual.
 *
 * Vem da API como `'parcial' | 'anual'` e é redundante com `bimestreId` — mas é
 * a redundância que a tela usa para desambiguar `null`: o anual é o único escopo
 * sem bimestre, e o texto do professor precisa dizer "ranking anual" em vez de
 * omitir a informação.
 */
export const TIPO_EMPATE = {
  PARCIAL: 'parcial',
  ANUAL: 'anual',
} as const

export type TipoEmpate = (typeof TIPO_EMPATE)[keyof typeof TIPO_EMPATE]

/** Como o desempate foi resolvido, no mesmo vocabulário do enum do Prisma. */
export const ORIGEM_DESEMPATE = {
  MANUAL: 'MANUAL',
  AUTOMATICO: 'AUTOMATICO',
} as const

export type OrigemDesempate = (typeof ORIGEM_DESEMPATE)[keyof typeof ORIGEM_DESEMPATE]

/**
 * Um empate que a API ainda não resolveu, em qualquer escopo.
 *
 * É o item de `GET .../pendencias`, que junta os empates de todos os bimestres
 * encerrados e o do anual numa lista só — a razão de a pendência ser um estado
 * da competição inteira e não de um bimestre.
 *
 * Os `grupos` vêm ordenados pelo nome, que é a ordem que o `DesempateService`
 * monta. Ela não é a ordem do ranking (essa se descobre em `valor`), e é o que a
 * tela usa como posição inicial dos seletores: sem desempate gravado, as equipes
 * empatadas não têm ordem definida, e a alfabética é a única que não inventa
 * preferência.
 */
export interface PendenciaDeDesempate {
  tipo: TipoEmpate
  /** Bimestre do empate; `null` quando o empate é do ranking anual. */
  bimestreId: string | null
  /** A pontuação que empatou as equipes deste bloco. */
  valor: number
  /** As equipes empatadas, com o mesmo formato do encerramento. */
  grupos: GrupoEmpatado[]
}

/** A posição que uma equipe vai ocupar depois do desempate. */
export interface OrdemDeDesempate {
  grupoId: string
  posicao: number
}

/**
 * Corpo de `POST /competicoes/:id/desempate`.
 *
 * A ordem tem que formar **exatamente** um empate já detectado no ranking do
 * escopo, sem repetir grupo nem posição — a API recusa com 400 nas três
 * condições. Por isso `bimestreId` acompanha a ordem: ela só vale junto com o
 * escopo a que pertence.
 */
export interface CorpoDoDesempate {
  bimestreId: string | null
  ordem: OrdemDeDesempate[]
}

/** Um desempate como a API o grava, com a origem que decide quem o resolveu. */
export interface DesempateGravado {
  grupoId: string
  posicao: number
  origem: OrigemDesempate
}

/** Resposta de `POST /competicoes/:id/desempate`. */
export interface RespostaDoDesempate {
  bimestreId: string | null
  desempates: DesempateGravado[]
}

/**
 * Um empate que o critério automático não resolveu.
 *
 * Traz a `posicao` do bloco, que a pendência não traz — é o backend que a
 * calculou e devolveu, e a tela não tem como refazê-la sem ler o ranking de novo.
 * Serve para dizer ao professor quais equipes continuam empatadas depois da
 * aplicação do critério.
 */
export interface EmpateResidual {
  tipo: TipoEmpate
  bimestreId: string | null
  valor: number
  posicao: number
  grupos: GrupoEmpatado[]
}

/**
 * Resposta de `POST .../aplicar-automatico`.
 *
 * `aplicados` é quantos blocos foram gravados, e não quantas equipes: um empate
 * de três equipes grava três posições e conta como uma aplicação. A distinção
 * importa porque o professor precisa saber se o botão resolveu alguma coisa — e um
 * `desempates.length` grande demais deixaria a impressão de vários empates
 * resolvidos.
 */
export interface RespostaDoDesempateAutomatico {
  bimestreId: string | null
  aplicados: number
  desempates: DesempateGravado[]
  residuais: EmpateResidual[]
}