/**
 * Formas de dado dos quatro relatórios da Etapa 10.
 *
 * Espelham o que `RelatoriosService` serializa (`README-API.md`, seção 11.13):
 * `GET /alunos/:id/relatorio-individual`, `GET
 * /alunos/:id/relatorio-comparativo-grupo`, `GET /grupos/:id/relatorio` e `GET
 * /grupos/:id/relatorio-comparativo`.
 *
 * São quatro envelopes com uma coisa em comum — e ela é o motivo de este arquivo
 * existir: **dois números de escalas diferentes convivem na mesma resposta.** A
 * síntese de cada bimestre vai de 0 a 10, e a `pontuacaoFinal` do grupo é a
 * **soma** dessas sínteses, indo a 40. Somar uma com a outra é o erro que a tela
 * precisa tornar impossível, e por isso a escala é um valor nomeado
 * (`ESCALA_DE_PONTUACAO`) e não um número espalhado pelo código: quem formata
 * precisa dizer em que escala está, e o rótulo do bloco sai da mesma tabela.
 *
 * As três escalas:
 *
 * | Escala             | Valor            | Onde aparece                       |
 * |--------------------|------------------|------------------------------------|
 * | `SINTESE_BIMESTRAL`| 0 a 10           | gráfico e tabelas, bimestre a bimestre |
 * | `MEDIA_BIMESTRAL`  | 0 a 10 (média)   | `pontuacaoFinal` do aluno          |
 * | `SOMA_BIMESTRAL`   | 0 a 40 (soma)    | `pontuacaoFinal` do grupo          |
 *
 * As duas últimas usam a mesma escala numérica e operações diferentes — a média
 * do aluno e a soma do grupo são da API, e a tela **lê o valor** em vez de
 * recalcular: recalcular aqui criaria um segundo lugar onde a conta pode divergir
 * da gravada no encerramento.
 */

/* ------------------------------------------------------------------ escalas -- */

export const ESCALA_DE_PONTUACAO = {
  /** A síntese de um bimestre: 0 a 10. É a escala dos gráficos. */
  SINTESE_BIMESTRAL: 'sintese-bimestral',
  /** Pontuação final do aluno: média das sínteses bimestrais, 0 a 10. */
  MEDIA_BIMESTRAL: 'media-bimestral',
  /** Pontuação final do grupo: soma das sínteses bimestrais, 0 a 40. */
  SOMA_BIMESTRAL: 'soma-bimestral',
} as const

export type EscalaDePontuacao = (typeof ESCALA_DE_PONTUACAO)[keyof typeof ESCALA_DE_PONTUACAO]

/** O que a tela diz sobre uma escala: título, teto e a frase que explica a conta. */
export interface DescricaoDaEscala {
  /** Nome da escala, como aparece no bloco de destaque. */
  titulo: string
  /** Teto da escala — é ele que impede que 33,10 seja lido como nota. */
  maximo: number
  /** Frase curta com a conta ("soma dos bimestres", "0 a 10"). */
  explicacao: string
}

const DESCRICOES: Record<EscalaDePontuacao, DescricaoDaEscala> = {
  [ESCALA_DE_PONTUACAO.SINTESE_BIMESTRAL]: {
    titulo: 'Síntese do bimestre',
    maximo: 10,
    explicacao: 'de 0 a 10',
  },
  [ESCALA_DE_PONTUACAO.MEDIA_BIMESTRAL]: {
    titulo: 'Média das sínteses',
    maximo: 10,
    explicacao: 'média das sínteses dos bimestres, de 0 a 10',
  },
  [ESCALA_DE_PONTUACAO.SOMA_BIMESTRAL]: {
    titulo: 'Soma das sínteses',
    maximo: 40,
    explicacao: 'soma das sínteses dos bimestres, de 0 a 40',
  },
}

/** Teto da escala das sínteses — o domínio fixo do eixo Y de todos os gráficos. */
export const MAXIMO_DA_SINTESE_BIMESTRAL = 10

/** Teto da pontuação final do grupo: quatro bimestres de 0 a 10. */
export const MAXIMO_DA_PONTUACAO_FINAL_DO_GRUPO = 40

/** A descrição de uma escala, para o bloco que a usa escrever o nome dela. */
export function descreverEscala(escala: EscalaDePontuacao): DescricaoDaEscala {
  return DESCRICOES[escala]
}

/* ------------------------------------------------------------------- tipos -- */

/** Matéria com a síntese do aluno nela, no bimestre. */
export interface MateriaDoAluno {
  componenteCurricularId: string
  nome: string
  valor: number
}

/** Colega de grupo do mesmo bimestre, com o detalhamento por matéria. */
export interface ColegaDeGrupo {
  alunoId: string
  nome: string
  /** Síntese do colega no bimestre (0 a 10), ou `null` se ele não tem síntese. */
  valor: number | null
  materias: MateriaDoAluno[]
}

/** Integrante do grupo no bimestre. */
export interface IntegranteDoGrupo {
  alunoId: string
  nome: string
  valor: number | null
}

/** Base dos bimestres de qualquer relatório: onde a síntese foi para. */
export interface BimestreDoRelatorio {
  bimestreId: string
  numero: number
  /**
   * Síntese bimestral (0 a 10) ou `null`.
   *
   * Nulo quando o bimestre ainda não foi encerrado, ou quando quem aparece não
   * tinha síntese gravada — e a tela escreve "—" em vez de 0, porque zero é uma
   * nota e ausência de nota é outra coisa.
   */
  valor: number | null
}

/** Bimestre do relatório individual, com as matérias do aluno. */
export interface BimestreDoAluno extends BimestreDoRelatorio {
  materias: MateriaDoAluno[]
}

/**
 * Bimestre do relatório comparado ao grupo.
 *
 * `grupo` muda de bimestre para bimestre — o aluno pode trocar de equipe no meio
 * da competição —, e por isso o grupo e os colegas estão **dentro** do bimestre e
 * não no topo do relatório. `grupo: null` é o bimestre em que ele não estava em
 * nenhuma equipe.
 */
export interface BimestreDoAlunoComparado extends BimestreDoAluno {
  grupo: { grupoId: string; nome: string } | null
  colegasDeGrupo: ColegaDeGrupo[]
}

/** Bimestre do relatório coletivo do grupo, com quem estava nele. */
export interface BimestreDoGrupo extends BimestreDoRelatorio {
  integrantes: IntegranteDoGrupo[]
}

/** Os outros grupos da competição, para o comparativo entre grupos. */
export interface GrupoComparativo {
  grupoId: string
  nome: string
  /**
   * Pontuação final do grupo (soma, até 40).
   *
   * Mesmo campo e mesmo significado da `pontuacaoFinal` do próprio relatório —
   * nunca somado com as sínteses bimestrais.
   */
  pontuacaoFinal: number | null
  bimestres: Array<{ bimestreId: string; numero: number; valor: number | null }>
}

export interface RelatorioIndividual {
  tipo: 'individual'
  alunoId: string
  nome: string
  competicaoId: string
  competicaoNome: string
  /** Média das sínteses bimestrais (0 a 10), ou `null` sem nenhuma síntese. */
  pontuacaoFinal: number | null
  bimestres: BimestreDoAluno[]
}

export interface RelatorioComparativoDoAluno {
  tipo: 'comparativo-grupo'
  alunoId: string
  nome: string
  competicaoId: string
  competicaoNome: string
  pontuacaoFinal: number | null
  bimestres: BimestreDoAlunoComparado[]
}

export interface RelatorioDoGrupo {
  tipo: 'coletivo-grupo'
  grupoId: string
  nome: string
  competicaoId: string
  competicaoNome: string
  /** Soma das sínteses bimestrais (até 40), ou `null` sem nenhuma síntese. */
  pontuacaoFinal: number | null
  bimestres: BimestreDoGrupo[]
}

/**
 * O comparativo entre grupos é o relatório do grupo com mais uma coisa.
 *
 * O `Omit` é do `tipo`, e não do relatório inteiro: os dois envelopes são o mesmo
 * grupo com o mesmo `pontuacaoFinal` (a soma, até 40) — o que muda é o `tipo`, que
 * a API usa para dizer à tela qual das duas formas chegou.
 */
export interface RelatorioComparativoDoGrupo extends Omit<RelatorioDoGrupo, 'tipo'> {
  tipo: 'comparativo-grupos'
  /** Os demais grupos da competição — o próprio não entra na lista. */
  comparativo: GrupoComparativo[]
}

/**
 * Qual dos quatro relatórios uma resposta é, para as telas decidirem o que falta.
 *
 * São os quatro `tipo`, e não só os dois envelopes "de base": os comparativos
 * têm `tipo` próprio (`comparativo-grupo`, `comparativo-grupos`), e deixar fora
 * os dois faria um `Record` indexado por eles — o mapa de rota do PDF, por
 * exemplo — recusar duas das quatro telas em tempo de compilação.
 */
export type TipoDeRelatorio =
  | RelatorioIndividual['tipo']
  | RelatorioComparativoDoAluno['tipo']
  | RelatorioComparativoDoGrupo['tipo']
  | RelatorioDoGrupo['tipo']

/** Os quatro relatórios, na união que o `useRequisicao` devolve. */
export type Relatorio =
  | RelatorioIndividual
  | RelatorioComparativoDoAluno
  | RelatorioDoGrupo
  | RelatorioComparativoDoGrupo

/* --------------------------------------------------------------- formatação -- */

/**
 * Rótulo curto do bimestre, como o eixo do gráfico escreve: `1º`, `2º`…
 *
 * É o mesmo rótulo no gráfico, nas tabelas e nas parcelas da soma, porque são o
 * mesmo bimestre: se cada lugar usasse um nome diferente, quem conferisse o
 * gráfico pela tabela teria que adivinhar a correspondência.
 */
export function rotuloCurtoDoBimestre(numero: number): string {
  return `${numero}º`
}

/**
 * Como a tela escreve um valor de pontuação, em qualquer escala.
 *
 * Deliberadamente **idêntico nas três escalas**: as duas casas decimais vêm do
 * backend e não têm por que mudar, e é o rótulo do bloco — não o número — que
 * diz se o que se lê é uma síntese (0 a 10) ou uma soma (0 a 40). Um formatador
 * que dividisse por 4 na escala da soma, ou que arredondasse diferente na da
 * média, criaria exatamente a mistura que a etapa proíbe; a escala entra como
 * parâmetro para que essa escolha seja sempre explícita na chamada.
 *
 * `null` vira o traço que o professor lê como "sem nota", e não 0 — componente
 * sem lançamento vale 0 na conta, mas bimestre não encerrado não vale nada.
 */
export function formatarPontuacao(valor: number | null): string {
  if (valor === null) return '—'
  return valor.toFixed(2)
}