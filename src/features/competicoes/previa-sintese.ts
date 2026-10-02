/**
 * Montagem dos dados da prévia de síntese: das notas lançadas às linhas que o
 * painel e a coluna da tabela mostram.
 *
 * Fica separado da conta (`src/lib/sinteseCalculo.ts`) e do componente porque é
 * aqui que mora a parte que o backend monta antes de calcular: quais matérias
 * entram, quais componentes têm lançamento, quem é integrante do grupo. É a
 * leitura de `calcularSintesesDosAlunos` e `calcularSintesesDosGrupos` do
 * `BimestresService`, e ela precisa bater com a delas — a prévia só é útil
 * porque antecipa o valor que o encerramento grava.
 *
 * As quatro decisões que valem conhecer:
 *
 * 1. **Entram todas as matérias do lecionamento, mesmo as sem componente.** O
 *    denominador da síntese bimestral é o número de matérias, e o encerramento
 *    itera `componentesPorMateria`, que o backend monta com uma entrada por
 *    componente curricular. Se a prévia dividisse só pelas matérias com nota,
 *    mostraria uma nota maior do que a que será gravada.
 * 2. **O que está no campo ganha do que está salvo, e campo vazio vale 0.** A
 *    prévia acompanha o professor digitando, antes do "Salvar": a nota pendente
 *    sobrescreve a salva, e um campo que ele limpou conta como "sem lançamento" —
 *    não volta para o valor antigo. É a precedência de `TabelaDeLancamentos`
 *    (`editados[alunoId] ?? salvo`), pelo mesmo motivo.
 * 3. **Texto que não passa no modelo não entra na conta**, e vale como
 *    lançamento ausente. A API nunca veria esse texto — a validação do modelo
 *    recusa com 400 —, mas a prévia é recalculada a cada tecla e o campo passa
 *    por "8,5" e "11" no caminho. Sem esta checagem, "8,5" entraria na conta
 *    como 8 (o `parseFloat` para na vírgula) e a tela mostraria um número que
 *    ninguém salvou.
 * 4. **Grupo sem integrante não tem valor, e não é 0.** O encerramento devolve
 *    esse grupo em `gruposSemIntegrantes` e o deixa fora do ranking.
 */

import {
  sinteseBimestralDoAluno,
  sinteseBimestralDoGrupo,
  sinteseDaMateria,
} from '../../lib/sinteseCalculo'
import { validarValorNoModelo } from './modelo-avaliacao'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type { GrupoComMembros } from './competicoes.tipos'
import type { Lancamento, MateriaComPesos } from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

/** Nota que está no campo e ainda não foi salva, para um componente e um aluno. */
export interface NotaPendente {
  componentePontuacaoId: string
  alunoId: string
  /** Texto exatamente como está no campo agora. */
  valor: string
}

/** Componente de um dos lados da conta, com a matéria a que pertence. */
interface ComponenteDaMateria {
  id: string
  pesoPercentual: number
  componenteCurricularId: string
}

export interface EntradaDaPrevia {
  /** Uma entrada por componente curricular do lecionamento, como a API devolve. */
  materias: readonly MateriaComPesos[]
  /** Lançamentos de todos os componentes do bimestre, por componente. */
  lancamentosPorComponente: ReadonlyMap<string, readonly Lancamento[]>
  /** Matriculados na sala: é sobre eles que o encerramento calcula. */
  alunos: readonly Aluno[]
  /** Grupos com a composição **deste** bimestre (RN9). */
  grupos: readonly GrupoComMembros[]
  modelo: ModeloAvaliacao
  /** Notas ainda não salvas, que entram por cima das salvas. */
  pendentes?: readonly NotaPendente[]
}

export interface EntradaDaPreviaDaMateria
  extends Omit<EntradaDaPrevia, 'materias' | 'grupos'> {
  /** Só esta matéria entra na conta. */
  materia: MateriaComPesos
}

/** A síntese de um aluno numa matéria, com o nome dela para o painel. */
export interface SinteseNaMateria {
  componenteCurricularId: string
  materiaNome: string
  valor: number
}

export interface PreviaDoAluno {
  alunoId: string
  nome: string
  codigoMatricula: string
  /** Uma por matéria do lecionamento, na ordem em que a API devolveu. */
  porMateria: SinteseNaMateria[]
  /** Síntese bimestral: a média simples das matérias acima. */
  valor: number
}

export interface PreviaDoGrupo {
  grupoId: string
  nome: string
  /** `null` quando o grupo não tem integrante neste bimestre. */
  valor: number | null
  integrantes: number
}

export interface PreviaDoBimestre {
  /** Alunos por nome, que é a ordem em que o encerramento os percorre. */
  alunos: PreviaDoAluno[]
  grupos: PreviaDoGrupo[]
  /** Cabeçalho da tabela de matérias do painel. */
  materias: Array<{ componenteCurricularId: string; materiaNome: string }>
  /**
   * Matérias do lecionamento que ainda não têm componente no bimestre.
   *
   * Elas entram na conta como 0 e no denominador, então a prévia cai enquanto o
   * professor não configurar aquela matéria. O painel avisa quais são, em vez de
   * deixar ele concluir que a turma foi mal numa matéria que nem existe.
   */
  materiasSemComponente: string[]
}

/** Chave do par (componente, aluno), que é a chave primária do lançamento. */
function chaveDoPar(componentePontuacaoId: string, alunoId: string): string {
  return `${componentePontuacaoId}::${alunoId}`
}

/**
 * O texto efetivo de um campo: o que está sendo digitado, ou o que está salvo.
 *
 * `undefined` significa "sem lançamento", que a conta trata como 0. A busca é por
 * componente e por aluno porque a chave do lançamento é esse par, e a nota
 * digitada na prova de Matemática não pode aparecer na de Português.
 */
function textoDaNota(
  componente: ComponenteDaMateria,
  alunoId: string,
  salvos: ReadonlyMap<string, string>,
  pendentes: ReadonlyMap<string, string>,
  modelo: ModeloAvaliacao,
): string | undefined {
  const digitado = pendentes.get(chaveDoPar(componente.id, alunoId))

  if (digitado !== undefined) {
    // Vazio é "sem lançamento" e pode entrar: o campo em branco é aluno sem nota
    // (regra da Etapa 05, que a API trata como 0). O que não pode é texto fora
    // do modelo, que a API recusaria.
    if (!digitado.trim()) return undefined
    return validarValorNoModelo(modelo, digitado).valido ? digitado.trim() : undefined
  }

  return salvos.get(alunoId)
}

/**
 * Os textos que valem para cada par (componente, aluno), em uma passada.
 *
 * Montar isso uma vez e reutilizar nas duas contas evita remapear a mesma lista
 * por aluno: a coluna da tabela recalcula a cada tecla digitada, e refazer a
 * varredura inteira do bimestre por tecla seria a diferença entre uma conta
 * barata e uma que trava a digitação.
 */
function textosEfetivos(
  componentes: readonly ComponenteDaMateria[],
  lancamentosPorComponente: ReadonlyMap<string, readonly Lancamento[]>,
  alunos: readonly Aluno[],
  modelo: ModeloAvaliacao,
  pendentes: readonly NotaPendente[],
): Map<string, Map<string, string | undefined>> {
  const pendentesPorPar = new Map<string, string>()
  for (const nota of pendentes) {
    pendentesPorPar.set(chaveDoPar(nota.componentePontuacaoId, nota.alunoId), nota.valor)
  }

  const porComponente = new Map<string, Map<string, string | undefined>>()

  for (const componente of componentes) {
    const salvos = new Map<string, string>()
    for (const lancamento of lancamentosPorComponente.get(componente.id) ?? []) {
      salvos.set(lancamento.alunoId, lancamento.valorNoModelo)
    }

    const textos = new Map<string, string | undefined>()
    for (const aluno of alunos) {
      const texto = textoDaNota(componente, aluno.id, salvos, pendentesPorPar, modelo)
      if (texto !== undefined) textos.set(aluno.id, texto)
    }

    porComponente.set(componente.id, textos)
  }

  return porComponente
}

/** Os componentes de uma matéria, no formato que a conta usa. */
function componentesDaMateria(materia: MateriaComPesos): ComponenteDaMateria[] {
  return materia.componentesPontuacao.map((componente) => ({
    id: componente.id,
    pesoPercentual: componente.pesoPercentual,
    componenteCurricularId: materia.componenteCurricularId,
  }))
}

/**
 * A prévia da síntese bimestral inteira: por aluno e por grupo.
 *
 * Espelha `calcularSintesesDosAlunos` e `calcularSintesesDosGrupos` do
 * `BimestresService`, com uma diferença de propósito: nada é gravado, e o grupo
 * sem integrante vem com `valor: null` em vez de sumir da lista.
 */
export function calcularPreviaDoBimestre({
  materias,
  lancamentosPorComponente,
  alunos,
  grupos,
  modelo,
  pendentes = [],
}: EntradaDaPrevia): PreviaDoBimestre {
  const componentes = materias.flatMap(componentesDaMateria)
  const textos = textosEfetivos(
    componentes,
    lancamentosPorComponente,
    alunos,
    modelo,
    pendentes,
  )

  const previewsDosAlunos: PreviaDoAluno[] = alunos.map((aluno) => {
    const porMateria = materias.map((materia) => ({
      componenteCurricularId: materia.componenteCurricularId,
      materiaNome: materia.materiaNome,
      valor: sinteseDaMateria(
        materia.componentesPontuacao.map((componente) => ({
          valorNoModelo: textos.get(componente.id)?.get(aluno.id),
          pesoPercentual: componente.pesoPercentual,
          componenteId: componente.id,
        })),
        modelo,
      ),
    }))

    return {
      alunoId: aluno.id,
      nome: aluno.nome,
      codigoMatricula: aluno.codigoMatricula,
      porMateria,
      valor: sinteseBimestralDoAluno(porMateria.map((materia) => materia.valor)),
    }
  })

  /*
   * O encerramento percorre os matriculados ordenados por nome, e o painel mostra
   * na mesma ordem: a lista de alunos da API não promete ordenação, e uma prévia
   * que muda de ordem conforme a chamada é mais difícil de conferir linha a linha.
   */
  const ordenados = [...previewsDosAlunos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  const valorPorAluno = new Map(ordenados.map((aluno) => [aluno.alunoId, aluno.valor]))

  return {
    alunos: ordenados,
    grupos: grupos.map((grupo) => {
      const integrantes = grupo.membrosGrupos

      return {
        grupoId: grupo.id,
        nome: grupo.nome,
        integrantes: integrantes.length,
        // Integrante fora da matrícula entra como 0, que é o `?? 0` do backend.
        valor:
          integrantes.length === 0
            ? null
            : sinteseBimestralDoGrupo(
                integrantes.map((membro) => valorPorAluno.get(membro.alunoId) ?? 0),
              ),
      }
    }),
    materias: materias.map((materia) => ({
      componenteCurricularId: materia.componenteCurricularId,
      materiaNome: materia.materiaNome,
    })),
    materiasSemComponente: materias
      .filter((materia) => materia.componentesPontuacao.length === 0)
      .map((materia) => materia.materiaNome),
  }
}

/**
 * A síntese de um aluno só numa matéria, para a coluna da tabela de lançamentos.
 *
 * Mesma conta de `calcularPreviaDoBimestre`, mas restrita a uma matéria e
 * devolvendo o valor por aluno, porque a tabela de lançamentos já tem a lista de
 * alunos e a ordem dela. Recalcular o bimestre inteiro para descartar as outras
 * matérias seria refazer o que a tela não mostra — e o pior, pagar uma chamada
 * de rede por componente a cada tecla digitada.
 *
 * A matéria sem componente algum devolve 0 para todo aluno, que é o que a conta
 * dá para uma lista de componentes vazia.
 */
export function sinteseDaMateriaPorAluno({
  materia,
  lancamentosPorComponente,
  alunos,
  modelo,
  pendentes = [],
}: EntradaDaPreviaDaMateria): Map<string, number> {
  const componentes = componentesDaMateria(materia)
  const textos = textosEfetivos(
    componentes,
    lancamentosPorComponente,
    alunos,
    modelo,
    pendentes,
  )

  const porAluno = new Map<string, number>()

  for (const aluno of alunos) {
    porAluno.set(
      aluno.id,
      sinteseDaMateria(
        componentes.map((componente) => ({
          valorNoModelo: textos.get(componente.id)?.get(aluno.id),
          pesoPercentual: componente.pesoPercentual,
          componenteId: componente.id,
        })),
        modelo,
      ),
    )
  }

  return porAluno
}
