import { describe, expect, it } from 'vitest'
import { aluno, grupo, lancamento, materia, materiaFechada, membro } from '../../test/handlers'
import { MODELO_CPS_ETEC, MODELO_NUMERICO } from '../../test/modelos-de-avaliacao'
import { calcularPreviaDoBimestre, sinteseDaMateriaPorAluno } from './previa-sintese'
import type { GrupoComMembros } from './competicoes.tipos'
import type { Lancamento } from './componentes-pontuacao.tipos'
import type { Aluno } from '../salas/salas.tipos'

/*
 * O que este spec cobre é a montagem, não a conta: a conta já está conferida
 * contra o doc `03` em `src/lib/sinteseCalculo.spec.ts`. O que mora aqui são as
 * decisões que só existem porque a prévia roda no navegador — a matéria sem
 * componente entrando no denominador, o campo digitado ganhando da nota salva, e
 * o grupo sem integrante não virando 0.
 *
 * Os números esperados saem do exemplo 1 do doc `03` sempre que dá: a Ana com
 * 8/10/6 na prova, caderno e projeto dá 7,8 em Matemática, e com 8,6 em
 * Português fecha em 8,2 de síntese bimestral.
 */

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })
const BIA = aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' })
const CAIO = aluno({ id: 'a3', nome: 'Caio', codigoMatricula: '26012' })

const ALUNOS = [ANA, BIA, CAIO]

/** A matéria do doc 03: Prova 50%, Caderno 20%, Projeto 30%. */
const MATEMATICA = materiaFechada('mat-1', 'Matemática', ['Prova', 50], ['Caderno', 20], ['Projeto', 30])

/** Matéria de componente único, que vale a própria nota. */
const PORTUGUES = materiaFechada('mat-2', 'Português', ['Dissertação', 100])

/** Matéria do lecionamento que o professor ainda não configurou no bimestre. */
const GEOGRAFIA = materia({ componenteCurricularId: 'mat-3', materiaNome: 'Geografia' })

const PROVA = 'mat-1-cp1'
const CADERNO = 'mat-1-cp2'
const PROJETO = 'mat-1-cp3'
const DISSERTACAO = 'mat-2-cp1'

/**
 * As notas da Ana, o exemplo 1 do doc 03 de ponta a ponta.
 *
 * 8×0,5 + 10×0,2 + 6×0,3 = 7,8 em Matemática; 8,6 na dissertação fecha 8,2 de
 * síntese bimestral, que é a média simples do doc.
 */
const NOTAS_DA_ANA: Lancamento[] = [
  lancamento(PROVA, ANA, '8'),
  lancamento(CADERNO, ANA, '10'),
  lancamento(PROJETO, ANA, '6'),
  lancamento(DISSERTACAO, ANA, '8.6'),
]

/** Agrupa as notas por componente, no formato que a prévia recebe da API. */
function lancamentosDe(notas: readonly Lancamento[]): Map<string, readonly Lancamento[]> {
  const porComponente = new Map<string, Lancamento[]>()

  for (const nota of notas) {
    const doComponente = porComponente.get(nota.componentePontuacaoId) ?? []
    doComponente.push(nota)
    porComponente.set(nota.componentePontuacaoId, doComponente)
  }

  return porComponente
}

/** Grupo com os integrantes que o cenário pedir, ou vazio quando não pedir nenhum. */
function grupoDoBimestre(id: string, nome: string, integrantes: readonly Aluno[] = []): GrupoComMembros {
  return {
    ...grupo({ id, nome, competicaoId: 'comp-1' }),
    membrosGrupos: integrantes.map((aluno) => membro(id, aluno, 'b1')),
  }
}

/** A linha da Ana, que é a que os cenários de nota montam. */
function previaDaAna(entrada: Parameters<typeof calcularPreviaDoBimestre>[0]) {
  return calcularPreviaDoBimestre(entrada).alunos[0]!
}

describe('calcularPreviaDoBimestre', () => {
  it('média entre as matérias do exemplo do doc 03: 7,8 e 8,6 dão 8,2', () => {
    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA, PORTUGUES],
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    expect(previa.alunos[0]!.nome).toBe('Ana')
    expect(previa.alunos[0]!.porMateria).toEqual([
      { componenteCurricularId: 'mat-1', materiaNome: 'Matemática', valor: 7.8 },
      { componenteCurricularId: 'mat-2', materiaNome: 'Português', valor: 8.6 },
    ])
    expect(previa.alunos[0]!.valor).toBe(8.2)
  })

  /*
   * A matéria sem componente entra como 0 **e** fica no denominador, porque é
   * assim que `calcularSintesesDosAlunos` monta a lista de entradas. Dividir
   * só pelas matérias com nota daria (7,8 + 8,6) / 2 = 8,2, e a prévia
   * mostraria um número maior do que o encerramento vai gravar.
   */
  it('conta a matéria sem componente no denominador, como o encerramento faz', () => {
    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA, PORTUGUES, GEOGRAFIA],
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    // (7,8 + 8,6 + 0) / 3 = 5,4666… → 5,47
    expect(previa.alunos[0]!.valor).toBe(5.47)
    expect(previa.materiasSemComponente).toEqual(['Geografia'])
  })

  it('avisa quais matérias estão sem componente, para a queda não parecer reprovação', () => {
    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA, GEOGRAFIA],
      lancamentosPorComponente: lancamentosDe([]),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    expect(previa.materiasSemComponente).toEqual(['Geografia'])
    // Com tudo configurado, o aviso some: ele é sobre a matéria sem componente.
    expect(
      calcularPreviaDoBimestre({
        materias: [MATEMATICA],
        lancamentosPorComponente: lancamentosDe([]),
        alunos: ALUNOS,
        grupos: [],
        modelo: MODELO_NUMERICO,
      }).materiasSemComponente,
    ).toEqual([])
  })

  it('trata aluno sem nenhum lançamento como 0, e não como falta de dado', () => {
    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA, PORTUGUES],
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    // A Bia não tem lançamento em componente nenhum: 0,00 nas duas matérias. A
    // prévia não some nem mostra "—", porque a API grava 0 para ela.
    const bia = previa.alunos.find((aluno) => aluno.nome === 'Bia')!
    expect(bia.porMateria.map((materia) => materia.valor)).toEqual([0, 0])
    expect(bia.valor).toBe(0)
  })

  it('converte o conceito pelo mesmo número do CPS ETEC do backend', () => {
    const previaDaAnaNoEtc = previaDaAna({
      materias: [MATEMATICA, PORTUGUES],
      lancamentosPorComponente: lancamentosDe([
        lancamento(PROVA, ANA, 'B'),
        lancamento(CADERNO, ANA, 'MB'),
        lancamento(PROJETO, ANA, 'R'),
        lancamento(DISSERTACAO, ANA, 'MB'),
      ]),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_CPS_ETEC,
    })

    // Exemplo 2 do doc 03: B/MB/R com 50/20/30 dá 7,5. Com 10 em Português,
    // a média bimestral fecha em (7,5 + 10) / 2 = 8,75.
    expect(previaDaAnaNoEtc.porMateria.map((materia) => materia.valor)).toEqual([7.5, 10])
    expect(previaDaAnaNoEtc.valor).toBe(8.75)
  })

  it('ordena os alunos por nome, como o encerramento os percorre', () => {
    // A API não promete ordem na lista de matriculados, e uma prévia que muda
    // de ordem conforme a chamada é mais difícil de conferir linha a linha.
    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA],
      lancamentosPorComponente: lancamentosDe([]),
      alunos: [CAIO, BIA, ANA],
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    expect(previa.alunos.map((aluno) => aluno.nome)).toEqual(['Ana', 'Bia', 'Caio'])
  })

  it('só calcula sobre os matriculados, mesmo com lançamento de quem saiu da sala', () => {
    const saiuDaSala = aluno({ id: 'a9', nome: 'Zeca', codigoMatricula: '26019' })

    const previa = calcularPreviaDoBimestre({
      materias: [MATEMATICA],
      lancamentosPorComponente: lancamentosDe([...NOTAS_DA_ANA, lancamento(PROVA, saiuDaSala, '10')]),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    })

    // O Zeca tem nota 10 no banco e não aparece: o encerramento itera a
    // matrícula, e a prévia mostra as mesmas linhas que ele.
    expect(previa.alunos.map((aluno) => aluno.nome)).toEqual(['Ana', 'Bia', 'Caio'])
  })

  describe('nota digitada que ainda não foi salva', () => {
    const entrada = {
      materias: [MATEMATICA, PORTUGUES],
      lancamentosPorComponente: lancamentosDe([
        lancamento(PROVA, ANA, '4'),
        lancamento(CADERNO, ANA, '10'),
        lancamento(PROJETO, ANA, '6'),
        lancamento(DISSERTACAO, ANA, '8.6'),
      ]),
      alunos: ALUNOS,
      grupos: [],
      modelo: MODELO_NUMERICO,
    }

    it('o que está no campo ganha do que está salvo', () => {
      // No banco a prova da Ana é 4, o que dá 5,8 em Matemática e 7,2 no
      // bimestre; com 8 no campo, sobe para os 7,8 e os 8,2 do exemplo do doc.
      expect(previaDaAna({ ...entrada }).valor).toBe(7.2)

      const previa = calcularPreviaDoBimestre({
        ...entrada,
        pendentes: [{ componentePontuacaoId: PROVA, alunoId: ANA.id, valor: '8' }],
      })

      expect(previa.alunos[0]!.valor).toBe(8.2)
    })

    it('campo vazio vale como sem lançamento, e não volta para a nota salva', () => {
      // 10×0,2 + 6×0,3 = 3,8: o que vale é o campo, que está em branco.
      const previa = calcularPreviaDoBimestre({
        ...entrada,
        pendentes: [{ componentePontuacaoId: PROVA, alunoId: ANA.id, valor: '  ' }],
      })

      expect(previa.alunos[0]!.valor).toBe(6.2)
    })

    /*
     * A prévia é recalculada a cada tecla, e o campo passa por "1", "11" e
     * "8,5" no caminho. A API nunca veria esses textos — a validação do modelo
     * recusa com 400 —, mas sem esta checagem o "8,5" entraria como 8 (o
     * `parseFloat` para na vírgula) e a tela mostraria uma síntese que ninguém
     * salvou.
     */
    it('texto fora do modelo vale como sem lançamento, e não entra na conta', () => {
      for (const invalido of ['11', '8,5', '0', 'abc']) {
        const previa = calcularPreviaDoBimestre({
          ...entrada,
          pendentes: [{ componentePontuacaoId: PROVA, alunoId: ANA.id, valor: invalido }],
        })

        // O mesmo valor do campo em branco, para qualquer texto recusado.
        expect(previa.alunos[0]!.valor, `texto: ${invalido}`).toBe(6.2)
      }
    })

    it('a nota digitada em um componente não vaza para o outro nem para outro aluno', () => {
      const previa = calcularPreviaDoBimestre({
        ...entrada,
        pendentes: [{ componentePontuacaoId: PROVA, alunoId: BIA.id, valor: '10' }],
      })

      // A Bia tem só a prova digitada, e o peso dela continua contando: 5.
      const bia = previa.alunos.find((aluno) => aluno.nome === 'Bia')!
      expect(bia.porMateria.map((materia) => materia.valor)).toEqual([5, 0])

      // A Ana segue com a nota salva na prova: 5,8 em Matemática, 7,2 no bimestre.
      expect(previa.alunos[0]!.valor).toBe(7.2)
    })
  })

  describe('grupos', () => {
    const entrada = {
      materias: [MATEMATICA, PORTUGUES],
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      modelo: MODELO_NUMERICO,
    }

    it('média das sínteses bimestrais dos integrantes', () => {
      // Ana 8,2 e Bia 0,0: (8,2 + 0) / 2 = 4,1.
      const previa = calcularPreviaDoBimestre({
        ...entrada,
        grupos: [grupoDoBimestre('g1', 'Turma da Ana', [ANA, BIA])],
      })

      expect(previa.grupos).toEqual([{ grupoId: 'g1', nome: 'Turma da Ana', valor: 4.1, integrantes: 2 }])
    })

    it('grupo sem integrante no bimestre não tem valor, e não é 0', () => {
      // O encerramento devolve o grupo em `gruposSemIntegrantes` e não grava
      // síntese para ele. Mostrar 0 aqui seria um número que nunca vai existir.
      const previa = calcularPreviaDoBimestre({
        ...entrada,
        grupos: [grupoDoBimestre('g1', 'Vazio'), grupoDoBimestre('g2', 'Cheio', [CAIO])],
      })

      expect(previa.grupos[0]).toEqual({ grupoId: 'g1', nome: 'Vazio', valor: null, integrantes: 0 })
      expect(previa.grupos[1]!.valor).toBe(0)
    })

    it('integrante que saiu da matrícula entra como 0, como no `?? 0` do backend', () => {
      const saiuDaSala = aluno({ id: 'a9', nome: 'Zeca', codigoMatricula: '26019' })

      const previa = calcularPreviaDoBimestre({
        ...entrada,
        grupos: [grupoDoBimestre('g1', 'Turma da Ana', [ANA, saiuDaSala])],
      })

      expect(previa.grupos[0]).toEqual({ grupoId: 'g1', nome: 'Turma da Ana', valor: 4.1, integrantes: 2 })
    })
  })
})

describe('sinteseDaMateriaPorAluno', () => {
  it('devolve a síntese de cada aluno só na matéria pedida', () => {
    // A coluna da tabela mostra uma matéria por vez, e a conta é a mesma — mas
    // recalcular o bimestre inteiro para descartar as outras matérias seria
    // pagar uma chamada de rede por componente a cada tecla digitada.
    const porAluno = sinteseDaMateriaPorAluno({
      materia: MATEMATICA,
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      modelo: MODELO_NUMERICO,
    })

    expect(porAluno.get(ANA.id)).toBe(7.8)
    expect(porAluno.get(BIA.id)).toBe(0)
    expect(porAluno.get(CAIO.id)).toBe(0)
    expect(porAluno.size).toBe(3)
  })

  it('mantém a ordem e o tamanho da lista de alunos que a tela já tem', () => {
    const porAluno = sinteseDaMateriaPorAluno({
      materia: PORTUGUES,
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: [BIA, ANA],
      modelo: MODELO_NUMERICO,
    })

    expect([...porAluno.keys()]).toEqual([BIA.id, ANA.id])
  })

  it('aceita a nota ainda não salva, como a coluna acompanha a digitação', () => {
    const porAluno = sinteseDaMateriaPorAluno({
      materia: MATEMATICA,
      lancamentosPorComponente: lancamentosDe(NOTAS_DA_ANA),
      alunos: ALUNOS,
      modelo: MODELO_NUMERICO,
      pendentes: [{ componentePontuacaoId: PROVA, alunoId: ANA.id, valor: '10' }],
    })

    // 10×0,5 + 10×0,2 + 6×0,3 = 8,8
    expect(porAluno.get(ANA.id)).toBe(8.8)
  })

  it('matéria sem componente algum devolve 0 para todo aluno', () => {
    const porAluno = sinteseDaMateriaPorAluno({
      materia: GEOGRAFIA,
      lancamentosPorComponente: lancamentosDe([]),
      alunos: ALUNOS,
      modelo: MODELO_NUMERICO,
    })

    expect([...porAluno.values()]).toEqual([0, 0, 0])
  })
})
