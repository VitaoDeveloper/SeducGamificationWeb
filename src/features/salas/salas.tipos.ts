/**
 * Formas de dado que a API devolve nas rotas de sala, lecionamento e aluno.
 *
 * Espelham o que o NestJS serializa, campo a campo, e não o modelo do Prisma:
 * quem consome são telas, e telas só precisam saber o que existe no JSON.
 * O que a API não manda, como o nome da escola numa resposta de aluno, não
 * entra aqui — o dado que não existe para o professor é buscado onde ele está.
 */

export interface EscolaResumo {
  id: string
  nome: string
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
