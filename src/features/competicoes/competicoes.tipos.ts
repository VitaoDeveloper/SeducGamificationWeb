/**
 * Formas de dado que a API devolve nas rotas de competição, bimestre, grupo e
 * membro.
 *
 * Espelham o que o NestJS serializa, campo a campo, e não o modelo do Prisma.
 * A diferença que importa para a tela: as datas chegam como texto ISO (o JSON
 * não tem tipo Date) e `situacao` chega como string do enum
 * `ABERTO | ENCERRADO`, que é o que decide se a composição do grupo pode ser
 * mexida.
 */

export const SITUACAO_BIMESTRE = {
  ABERTO: 'ABERTO',
  ENCERRADO: 'ENCERRADO',
} as const

export type SituacaoBimestre = (typeof SITUACAO_BIMESTRE)[keyof typeof SITUACAO_BIMESTRE]

/** Linha de `GET /competicoes/:id` (bimestres) e do retorno de `POST /competicoes`. */
export interface Bimestre {
  id: string
  competicaoId: string
  numero: number
  dataInicio: string
  dataFim: string
  situacao: SituacaoBimestre
  createdAt: string
  updatedAt: string
}

/** Linha de `POST /competicoes/:id/grupos` e item de `gruposCompetidores`. */
export interface GrupoCompetidor {
  id: string
  competicaoId: string
  nome: string
  createdAt: string
  updatedAt: string
}

/** Aluno embutido em `membrosGrupos[].aluno`, com o recorte que a tela usa. */
export interface AlunoDoMembro {
  id: string
  nome: string
  codigoMatricula: string
}

/** Membro de um grupo no bimestre; a API só o inclui no grupo do bimestre filtrado. */
export interface MembroDoGrupo {
  grupoId: string
  alunoId: string
  bimestreId: string
  aluno: AlunoDoMembro
}

/** Grupo com os integrantes do bimestre selecionado. */
export interface GrupoComMembros extends GrupoCompetidor {
  membrosGrupos: MembroDoGrupo[]
}

/**
 * A competição como o professor a vê.
 *
 * `POST /competicoes` devolve a competição com os `bimestres`; as leituras
 * (`GET /competicoes/:id` e `GET /lecionamentos/:id/competicoes`) acrescentam
 * `gruposCompetidores` (sem membros). Um tipo só serve aos três: o que muda é a
 * presença dos aninhados, e a tela lê os dois campos em todos os caminhos.
 */
export interface CompeticaoCompleta {
  id: string
  lecionamentoId: string
  nome: string
  bimestres: Bimestre[]
  gruposCompetidores: GrupoCompetidor[]
  createdAt: string
  updatedAt: string
}

/** Corpo de `GET /competicoes/:id/grupos?bimestreId=`. */
export interface GruposDaCompeticao {
  /** Bimestre efetivamente usado — o mesmo enviado, ou o aberto mais recente. */
  bimestreId: string
  grupos: GrupoComMembros[]
}

/** Bimestre enviado na criação: mesmos campos, mas ainda sem id nem situação. */
export interface NovoBimestre {
  numero: number
  dataInicio: string
  dataFim: string
}

/** Corpo de `POST /competicoes`. */
export interface NovaCompeticao {
  nome: string
  lecionamentoId: string
  bimestres: NovoBimestre[]
}

/**
 * Corpo de `PATCH /competicoes/:id`.
 *
 * Só o nome muda: os bimestres e quem participa da competição são o que ela é,
 * e nenhuma tela daria a um professor a chance de trocá-los por engano — o nome
 * é a parte decidida depois, quando a disputa já ganhou um apelido.
 */
export interface EditarCompeticao {
  nome: string
}

/**
 * Corpo de `PATCH /bimestres/:id`.
 *
 * As duas datas juntas, mesmo que só uma vá mudar: a API aceita cada uma
 * opcional, mas a tela sempre grava o par completo, porque é o par que a
 * validação contra os bimestres vizinhos julga.
 */
export interface EditarBimestre {
  dataInicio: string
  dataFim: string
}

/**
 * Corpo de `PATCH /grupos/:id`.
 *
 * Só o nome: o grupo é a equipe que atravessa o ano, e quem está nele é assunto
 * do gerenciador de membros, por bimestre — não do rótulo da equipe.
 */
export interface EditarGrupo {
  nome: string
}
