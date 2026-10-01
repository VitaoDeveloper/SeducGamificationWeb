/**
 * Formas de dado dos três rankings da Etapa 08.
 *
 * Espelham o que a API devolve em `README-API.md`, seção 11.10:
 * `GET /competicoes/:id/ranking?bimestreId=` (parcial), `GET
 * /competicoes/:id/ranking` (anual) e `GET /competicoes/:id/ranking-individual`
 * (individual).
 *
 * Três coisas do contrato merecem ficar escritas aqui, porque são elas que
 * moldam a tela:
 *
 * 1. **Os três rankings são o mesmo envelope.** Só mudam o `tipo`, o que o
 *    `bimestreId` vale e se o item traz `grupoId` ou `alunoId`. Por isso a
 *    posição, o valor e a flag de empate não são redeclarados três vezes: eles
 *    vêm de `ItemBase` e as duas especializações só acrescentam o identificador
 *    de quem pontuou.
 * 2. **Posição repetida é a marca do empate, e a flag confirma.** Quem fecha com
 *    a mesma pontuação recebe a mesma posição (`1, 1, 3` — `README-API.md`,
 *    seção 8) e `empate: true`. A tela não recalcula nada disso: desenha a
 *    posição que veio e usa a flag para o destaque. Desempate já gravado
 *    (manual ou automático, Etapa 09) chega com posições distintas e
 *    `empate: false`.
 * 3. **`bimestresEncerrados` é o que diz se o resultado é parcial.** Não é
 *    `completo` porque é o número que o professor e o aluno conseguem conferir
 *    ("2 de 4"), e é dele que o aviso de resultado parcial se serve.
 */

export const TIPO_RANKING = {
  PARCIAL: 'parcial',
  ANUAL: 'anual',
  INDIVIDUAL: 'individual',
} as const

export type TipoRanking = (typeof TIPO_RANKING)[keyof typeof TIPO_RANKING]

/**
 * Quantos bimestres uma competição tem.
 *
 * `POST /competicoes` recusa competição sem os quatro (`README-API.md`, seção
 * 11.5), então o total é fixo e a comparação de "resultado parcial" é um `===`.
 */
export const TOTAL_DE_BIMESTRES = 4

/** O que toda linha de ranking tem, seja de equipe ou de aluno. */
export interface ItemBase {
  /** Posição no ranking; repetida entre os que empataram. */
  posicao: number
  /**
   * A pontuação que ordenou a lista.
   *
   * A escala muda com o tipo de ranking, e por isso a coluna é rotulada por
   * quem mostra a tabela: a parcial e a individual vão de 0 a 10 (média de
   * sínteses) e a anual de 0 a 40 (soma das sínteses, `README-API.md`, seção 8,
   * itens 5 e 6).
   */
  valor: number
  /** `true` quando quem está nesta linha empatou com outro. */
  empate: boolean
  /** Nome de quem pontuou, como o professor e o aluno vão ler. */
  nome: string
}

/** Linha de ranking de equipe — o ranking parcial e o anual. */
export interface ItemDeGrupo extends ItemBase {
  grupoId: string
}

/** Linha do ranking individual anual. */
export interface ItemDeAluno extends ItemBase {
  alunoId: string
}

/**
 * Envelope dos rankings de equipe (parcial e anual).
 *
 * O nome `RespostaDeRanking` e não `RankingDeGrupos` porque a mesma forma volta
 * em `/ranking` e em `/ranking-individual`, mudando só o `tipo` e o que o item
 * carrega — e o que a tela precisa ler é o envelope.
 */
export interface RespostaDeRanking {
  tipo: TipoRanking
  competicaoId: string
  /**
   * Bimestre do ranking parcial; `null` no anual, que soma os quatro.
   *
   * Nulo e não string vazia porque é o que a API devolve, e porque a diferença
   * importa para quem lê: ausente no anual é o que faz a tela não oferecer
   * seletor de bimestre naquela sub-visão.
   */
  bimestreId: string | null
  /** Quantos dos quatro bimestres já foram encerrados (e portanto têm síntese). */
  bimestresEncerrados: number
  /** `true` quando os quatro bimestres estão encerrados. */
  completo: boolean
  itens: ItemDeGrupo[]
}

/** Envelope do ranking individual, que é anual e por isso não tem `bimestreId`. */
export interface RespostaDoRankingIndividual {
  tipo: TipoRanking
  competicaoId: string
  bimestresEncerrados: number
  completo: boolean
  itens: ItemDeAluno[]
}

/**
 * O ranking ainda está em andamento: nem todos os bimestres foram encerrados.
 *
 * É a função que a Etapa 08 pede para decidir do aviso de resultado parcial, e
 * ela lê `bimestresEncerrados` em vez de `completo` porque o número é o que a
 * mensagem mostra ("2 de 4 bimestres encerrados") — quem lê o aviso precisa
 * conferir a conta, e não confiar num booleano.
 */
export function resultadoParcial(bimestresEncerrados: number): boolean {
  return bimestresEncerrados < TOTAL_DE_BIMESTRES
}

/** Posição como a tela escreve: "1º", "2º"… com o número ordinal. */
export function formatarPosicao(posicao: number): string {
  return `${posicao}º`
}
