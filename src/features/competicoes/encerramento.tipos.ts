/**
 * Formas de dado de `POST /bimestres/:id/encerrar`.
 *
 * O encerramento é a única chamada da Etapa 07 que **escreve** de forma
 * irreversível: a API calcula e grava as sínteses, muda a situação para
 * `ENCERRADO` e, a partir daí, lançamentos, pesos e composição dos grupos ficam
 * congelados (RN22). Por isso a resposta não é só um "ok" — ela é o que a tela
 * mostra como resultado, e por isso espelha campo a campo o que o NestJS
 * serializa.
 *
 * Duas coisas merecem nota:
 *
 * 1. **As sínteses vêm na resposta.** O plano desta etapa previa que o
 *    encerramento devolvesse só confirmação + empates, e que as sínteses
 *    oficiais fossem buscadas depois pelos endpoints de ranking e relatório
 *    (Etapas 08 e 10). A API atual devolve `sinteseAluno` e `sinteseGrupo` na
 *    própria resposta — que é a mesma coisa, sem a segunda ida ao servidor — e é
 *    esse payload que o painel de sínteses oficiais desenha. Se uma versão da API
 *    não devolver as listas, elas vêm vazias e o painel diz isso na tela, em vez
 *    de mostrar uma conta feita no navegador como se fosse a oficial.
 * 2. **`competicaoConcluida` vem da API, e não de `numero === 4`.** O 4º
 *    bimestre é o da regra (RN21/RN22), mas quem decide se a competição acabou é
 *    o backend, e é dele que a tela lê.
 */

import type { MateriaPendente } from './componentes-pontuacao.tipos'

/** O que o encerramento contou antes de gravar: pessoas, matérias e equipes. */
export interface TotaisDoEncerramento {
  alunos: number
  materias: number
  grupos: number
}

/** Síntese bimestral de um aluno, gravada no encerramento. */
export interface SinteseOficialDoAluno {
  bimestreId: string
  alunoId: string
  nome: string
  valor: number
}

/** Síntese bimestral de um grupo, gravada no encerramento. */
export interface SinteseOficialDoGrupo {
  bimestreId: string
  grupoId: string
  nome: string
  integrantes: number
  valor: number
}

/** Um grupo dentro de um empate detectado no ranking parcial. */
export interface GrupoEmpatado {
  grupoId: string
  nome: string
  valor: number
}

/**
 * Empate detectado no encerramento: os grupos que fecharam o bimestre com a
 * mesma pontuação.
 *
 * A chave do desempate é o conjunto `grupos` inteiro — é ele que a Etapa 09
 * reordena, e não a posição, que ainda não existe.
 */
export interface EmpateDoBimestre {
  bimestreId: string
  valor: number
  grupos: GrupoEmpatado[]
}

/** Pontuação final de um grupo na competição, só quando a competição acabou. */
export interface PontuacaoFinal {
  grupoId: string
  nome: string
  valor: number
}

/** Corpo de `POST /bimestres/:id/encerrar`. */
export interface ResultadoDoEncerramento {
  bimestreId: string
  numero: number
  situacao: string
  encerradoEm: string
  totais: TotaisDoEncerramento
  sinteseAluno: SinteseOficialDoAluno[]
  sinteseGrupo: SinteseOficialDoGrupo[]
  empates: EmpateDoBimestre[]
  /** `true` quando este encerramento fechou a competição (o 4º bimestre). */
  competicaoConcluida: boolean
  /** Preenchido junto com `competicaoConcluida`; `null` nos outros bimestres. */
  pontuacoesFinais: PontuacaoFinal[] | null
}

/**
 * A recusa da API, já lida para a tela.
 *
 * Não é uma forma da API: é o que o modal de encerramento mostra quando a
 * chamada volta com erro — a mensagem e, quando o motivo foram pesos abertos, as
 * matérias com o quanto falta. Mora aqui porque é dado, e não porque a API
 * tenha esse formato: ver `recusaDoEncerramento` em `encerramento.api.ts`.
 */
export interface RecusaDoEncerramento {
  mensagem: string
  /**
   * Matérias que não somam 100%.
   *
   * É o mesmo formato de `MateriaPendente` (Etapa 05, `.../validar`), e o mesmo
   * tipo: a API recusa o encerramento com a mesma lista que já devolve na
   * validação, então redeclarar aqui só criaria um segundo formato do mesmo dado
   * para dar errado em silêncio.
   */
  materiasPendentes: MateriaPendente[]
  /**
   * A chamada estourou o tempo, e a situação do bimestre ficou desconhecida.
   *
   * Existe para a tela não oferecer "tentar de novo" no único erro em que repetir
   * não ajuda: a transação pode ter sido gravada, e a mensagem manda recarregar a
   * página para a situação vir do servidor.
   */
  tempoEsgotado: boolean
}
