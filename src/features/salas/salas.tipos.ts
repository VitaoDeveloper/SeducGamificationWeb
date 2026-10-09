/**
 * Formas de dado que a API devolve nas rotas de sala, lecionamento e aluno.
 *
 * Espelham o que o NestJS serializa, campo a campo, e não o modelo do Prisma:
 * quem consome são telas, e telas só precisam saber o que existe no JSON.
 * O que a API não manda, como o nome da escola numa resposta de aluno, não
 * entra aqui — o dado que não existe para o professor é buscado onde ele está.
 */

/**
 * A escala da escola, como a API manda dentro de `escola.modeloAvaliacao`.
 *
 * `nivelEscalas` vem vazia no modelo numérico — a nota de 1 a 10 é digitada, não
 * escolhida —, e o que ela traz para o modelo conceitual são os rótulos com o
 * número que cada um vale. O campo existe porque o formato do lançamento de nota
 * depende dele (ver `features/competicoes/modelo-avaliacao.ts`).
 */
export interface ModeloAvaliacaoDaEscola {
  tipoEscala: string
  nivelEscalas: { rotulo: string; valorNumerico: number }[]
}

export interface EscolaResumo {
  id: string
  nome: string
  /**
   * O modelo de avaliação da escola, que decide o campo de nota.
   *
   * Vai na escola de propósito, e não numa rota de modelos: `GET /salas` e
   * `GET /escolas` já são chamadas que a tela faz, e o modelo é o que valida o
   * lançamento no servidor — mandá-lo junto é o que impede a interface de
   * adivinhar um modelo e errar o campo de toda a turma.
   */
  modeloAvaliacao: ModeloAvaliacaoDaEscola
}

/** Linha de `GET /salas` e `POST /salas`. */
export interface Sala {
  id: string
  nome: string
  anoLetivo: number
  escolaId: string
  professorCriadorId: string
  escola: EscolaResumo
  createdAt: string
  updatedAt: string
}

export interface ComponenteCurricular {
  id: string
  nome: string
  lecionamentoId: string
}

export interface ProfessorResumo {
  id: string
  nome: string
  codigoMatricula: string
}

/** Linha de `GET /salas/:salaId/lecionamentos`. */
export interface Lecionamento {
  id: string
  salaId: string
  professorId: string
  professor: ProfessorResumo
  componentesCurriculares: ComponenteCurricular[]
  createdAt: string
  updatedAt: string
}

/** Linha de `GET /salas/:salaId/alunos`. */
export interface Aluno {
  id: string
  nome: string
  codigoMatricula: string
  createdAt: string
}

export interface NovaSala {
  nome: string
  anoLetivo: number
  escolaId: string
}

/**
 * Corpo de `PATCH /salas/:id`.
 *
 * `escolaId` fica de fora de propósito: a sala pertence à escola em que foi
 * criada, e mudar de escola significaria rematricular todos os alunos e
 * recomeçar as competições. A API não aceita a troca, então o corpo nem a
 * carrega.
 */
export interface EditarSala {
  nome: string
  anoLetivo: number
}

export interface NovoAluno {
  nome: string
}

/**
 * Sala agrupada pela escola, para a listagem.
 *
 * A API devolve a lista plana e ordenada por ano letivo; o agrupamento é
 * decisão de tela, porque o professor pode atuar em mais de uma escola (RN27) e
 * uma lista misturada esconderia a qual instituição cada turma pertence.
 *
 * Genérica porque o agrupamento serve tanto a sala pura quanto à sala com o
 * lecionamento do professor anexado pela listagem: o que os dois têm em comum
 * é a escola, e é por ela que o agrupamento acontece.
 */
export interface GrupoDeSalas<T = Sala> {
  escola: EscolaResumo
  salas: T[]
}
