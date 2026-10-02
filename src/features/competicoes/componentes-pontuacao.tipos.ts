/**
 * Formas de dado das rotas de componente de pontuação e lançamento de nota.
 *
 * Espelham o que o NestJS serializa. As duas coisas que se veem aqui e merecem
 * nota: `pesoPercentual` chega como número, e não como o `Decimal(5,2)` do Prisma
 * (a API converte antes de responder), e `valorNoModelo` chega como **texto** —
 * "8.5" no modelo numérico, "MB" no conceitual. É por isso que o lançamento
 * valida string, e não número.
 */

/** Retorno de `POST /bimestres/:id/componentes-pontuacao`. */
export interface ComponentePontuacao {
  id: string
  bimestreId: string
  componenteCurricularId: string
  nome: string
  pesoPercentual: number
  createdAt: string
  updatedAt: string
}

/**
 * Item de `componentesPontuacao[]` em `GET /bimestres/:id/componentes-pontuacao`.
 *
 * `componenteCurricularId` é anulável aqui, e não no retorno da criação: a coluna
 * do banco aceita componente sem matéria, e a listagem entrega o registro como
 * veio.
 */
export interface ComponentePontuacaoDoBimestre {
  id: string
  nome: string
  pesoPercentual: number
  componenteCurricularId: string | null
  createdAt: string
}

/**
 * Uma matéria do lecionamento com os componentes de pontuação do bimestre.
 *
 * A API já agrupa por matéria: a tela não reagrupa nem resorts, e `somaPesoPercentual`
 * existe para conferência — o indicador da tela é `avaliarPesos`, em `pesos.ts`,
 * porque a soma em ponto flutuante precisa do arredondamento que o banco já faz.
 */
export interface MateriaComPesos {
  componenteCurricularId: string
  materiaNome: string
  somaPesoPercentual: number
  componentesPontuacao: ComponentePontuacaoDoBimestre[]
}

/** Corpo de `GET /bimestres/:id/componentes-pontuacao`. */
export interface ComponentesDoBimestre {
  bimestreId: string
  /** Uma entrada por componente curricular do lecionamento, mesmo sem componente. */
  materias: MateriaComPesos[]
  /** `true` quando toda matéria já soma 100%. */
  todasFechadas: boolean
}

/** Matéria que ainda não fecha os 100%, com o quanto falta. */
export interface MateriaPendente {
  componenteCurricularId: string
  materiaNome: string
  somaPesoPercentual: number
  faltaParaFechar: number
}

/** Corpo de `POST /bimestres/:id/componentes-pontuacao/validar`. */
export interface ValidacaoDePesosDaApi {
  fechado: boolean
  materiasPendentes: MateriaPendente[]
}

/** Corpo de `POST /bimestres/:id/componentes-pontuacao`. */
export interface NovoComponentePontuacao {
  componenteCurricularId: string
  nome: string
  pesoPercentual: number
}

/** Aluno embutido em `lancamentos[].aluno`, com o recorte que a tela usa. */
export interface AlunoDoLancamento {
  id: string
  nome: string
  codigoMatricula: string
}

/**
 * Nota lançada, de `GET` e de `POST /componentes-pontuacao/:id/lancamentos`.
 *
 * Não tem `id`: a chave primária é o par (componente, aluno), porque um aluno
 * lança uma vez por componente e relançar atualiza no lugar (`upsert`).
 */
/**
 * Uma nota lançada, como a **listagem** devolve.
 *
 * `aluno` só vem no `GET`: o `POST` de nota simples e o de lote respondem a
 * entidade criada, sem o aluno embutido (`upsert` cru no `LancamentosService`).
 * Por isso quem chama os dois lados tem `LancamentoCriado`, abaixo.
 *
 * `createdAt`/`updatedAt` não existem: o modelo `Lancamento` do banco tem só as
 * três colunas de dados e a chave composta, sem carimbo de tempo. Declarar os
 * dois faria a tela procurar um campo que nunca chega.
 */
export interface Lancamento {
  componentePontuacaoId: string
  alunoId: string
  valorNoModelo: string
  aluno: AlunoDoLancamento
}

/** Resposta de gravar uma nota (simples ou em lote): sem o aluno embutido. */
export type LancamentoCriado = Omit<Lancamento, 'aluno'>

/** Uma nota do corpo de lançamento, simples ou em lote. */
export interface LancarNota {
  alunoId: string
  valorNoModelo: string
}

/** Corpo de `POST /componentes-pontuacao/:id/lancamentos/lote`. */
export interface LoteDeLancamentos {
  lancamentos: LancarNota[]
}
