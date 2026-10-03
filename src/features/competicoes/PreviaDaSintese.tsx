import { Alert, Badge, Button, Card, Spinner, Table } from '../../components'
import type { TableColumn } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { useComponentesDoBimestre, useLancamentosDeComponentes } from './componentes-pontuacao.hooks'
import { calcularPreviaDoBimestre } from './previa-sintese'
import { AVISO_DE_PREVIA } from './TabelaDeLancamentos'
import { rotuloDoBimestre } from './bimestres'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import { SEM_MODELO_DE_AVALIACAO } from './modelo-avaliacao'
import type { PreviaDoAluno, PreviaDoGrupo } from './previa-sintese'
import type { Bimestre, GrupoComMembros } from './competicoes.tipos'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type { Aluno } from '../salas/salas.tipos'

/** Cabeçalho de seção dentro do painel, no mesmo peso dos títulos das abas. */
const TITULO_DA_SECAO =
  'text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase'

export interface PreviaDaSinteseProps {
  bimestre: Bimestre
  /** Matriculados na sala, que é sobre quem o encerramento calcula. */
  alunos: Aluno[]
  /** Grupos com a composição deste bimestre. */
  grupos: GrupoComMembros[]
  /**
   * Modelo da escola, o mesmo que decide o campo de lançamento e valida a nota.
   * `null` quando a API não informou o modelo: sem a escala, a conta da prévia não
   * sabe converter um rótulo em número, e o painel avisa em vez de mostrar um
   * número que a API não vai gravar.
   */
  modelo: ModeloAvaliacao | null
}

/**
 * Painel "Prévia da síntese do bimestre": o aluno e o grupo com a nota que
 * terão quando o bimestre for encerrado.
 *
 * Só existe porque a API não tem essa rota: ela grava as sínteses no encerramento
 * (Etapa 07) e não oferece "ver a parcial". O professor que lançou a prova de
 * terça e quer saber se a turma está passando por cima teria de esperar o
 * encerramento, quando a nota já é irreversível. A conta é a mesma do
 * `sinteseCalculo`, então o número bate com o que será gravado.
 *
 * Quatro escolhas que valem conhecer:
 *
 * 1. **Encerrado, o painel não calcula.** A síntese gravada é a da API, e a
 *    Etapa 06 põe fora de escopo recalcular dado de bimestre encerrado. Mostrar
 *    aqui uma conta feita no navegador seria um segundo número para a mesma
 *    coisa, e o professor não teria como saber qual é o bom.
 * 2. **As matérias entram todas, mesmo as sem componente.** Elas valem 0 no
 *    denominador, que é como o encerramento monta a conta, e o painel avisa
 *    quais estão assim — do contrário a queda da média pareceria reprovação em
 *    matéria que nem existe.
 * 3. **A coluna de matérias fica visível.** A síntese bimestral é uma média, e uma
 *    média sem as parcelas não deixa o professor conferir nada: é a coluna que
 *    mostra *qual* matéria está puxando a nota para baixo.
 * 4. **Duas tabelas, e não uma só.** Aluno e grupo são contas diferentes (média
 *    entre matérias, e média entre integrantes) e a soma delas não é a pontuação
 *    do grupo — essa é a Etapa 08.
 */
export function PreviaDaSintese({ bimestre, alunos, grupos, modelo }: PreviaDaSinteseProps) {
  const componentes = useComponentesDoBimestre(bimestre.id)

  const idsDosComponentes = (componentes.dados?.materias ?? [])
    .flatMap((materia) => materia.componentesPontuacao.map((componente) => componente.id))
    .sort()
  const lancamentos = useLancamentosDeComponentes(idsDosComponentes)

  const encerrado = bimestre.situacao === SITUACAO_BIMESTRE.ENCERRADO

  if (encerrado) {
    return (
      <Alert tone="info">
        O {rotuloDoBimestre(bimestre.numero)} está encerrado, e a síntese dele já foi
        gravada pela API. Esta prévia só faz sentido com o bimestre aberto — é lá que
        o número ainda pode mudar.
      </Alert>
    )
  }

  if (componentes.carregando || lancamentos.carregando) {
    return (
      <Card bare>
        <div className="flex flex-col items-center gap-3 px-6 py-14">
          <Spinner label="Calculando a prévia" />
          <span className="text-neutral-500 text-sm">Calculando a prévia da síntese…</span>
        </div>
      </Card>
    )
  }

  const materias = componentes.dados?.materias ?? []

  /*
   * Falha e "não tem componente"-produzem a mesma `materias` vazia, mas não são a
   * mesma coisa: a primeira é a API recusando a leitura, e a segunda é o professor
   * que ainda não configurou os pesos. Sem esta distinção, uma falha virava
   * instrução errada — "vá em Componentes, defina os pesos" — para quem não tinha
   * nada a configurar, e sem botão de nova tentativa.
   */
  if (componentes.erro) {
    return (
      <Alert tone="erro">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{componentes.erro}</span>
          <Button variant="outline" size="sm" onClick={componentes.recarregar}>
            Tentar de novo
          </Button>
        </div>
      </Alert>
    )
  }

  if (materias.length === 0) {
    return (
      <Alert tone="info">
        Este bimestre ainda não tem componente de pontuação. Vá em <strong>Componentes</strong>,
        defina os pesos e volte para ver a prévia da síntese.
      </Alert>
    )
  }

  if (alunos.length === 0) {
    return (
      <Alert tone="info">
        Nenhum aluno matriculado nesta sala ainda, então não há o que calcular.
      </Alert>
    )
  }

  /*
   * O modelo é lido depois do "encerrado" de propósito: com o bimestre fechado quem
   * manda no número é a síntese que a API gravou, e ela não passa por esta conta —
   * um modelo desconhecido não tem o que atrapalhar ali.
   */
  if (!modelo) {
    return (
      <Alert tone="erro" role="alert">
        {SEM_MODELO_DE_AVALIACAO}
      </Alert>
    )
  }

  const previa = calcularPreviaDoBimestre({
    materias,
    lancamentosPorComponente: lancamentos.dados ?? new Map(),
    alunos,
    grupos,
    modelo,
  })

  return (
    <div className="space-y-6">
      {/*
       * O aviso é o primeiro elemento do painel, não um rodapé: a diferença entre
       * "esta é a nota" e "esta é a nota *por enquanto*" precisa entrar antes do
       * número, e não depois que o professor já leu o número.
       */}
      <Alert tone="info">
        <strong>{AVISO_DE_PREVIA}</strong> Estes números são calculados aqui no
        navegador, com as notas lançadas até agora. A síntese oficial é gravada pela
        API no encerramento do bimestre.
      </Alert>

      {componentes.erro ? <Alert tone="erro">{componentes.erro}</Alert> : null}
      {lancamentos.erro ? <Alert tone="erro">{lancamentos.erro}</Alert> : null}

      {previa.materiasSemComponente.length > 0 ? (
        <Alert tone="info">
          {previa.materiasSemComponente.join(', ')}{' '}
          {previa.materiasSemComponente.length === 1
            ? 'ainda não tem componente de pontuação neste bimestre e vale 0 na média'
            : 'ainda não têm componente de pontuação neste bimestre e valem 0 na média'}
          , até você configurar os pesos.
        </Alert>
      ) : null}

      <section aria-labelledby="titulo-previa-alunos" className="space-y-3">
        <h2 id="titulo-previa-alunos" className={TITULO_DA_SECAO}>
          Por aluno
        </h2>

        <Card bare>
          <TabelaDeAlunos previa={previa.alunos} materias={previa.materias} />
        </Card>
      </section>

      <section aria-labelledby="titulo-previa-grupos" className="space-y-3">
        <h2 id="titulo-previa-grupos" className={TITULO_DA_SECAO}>
          Por grupo
        </h2>

        <Card bare>
          <TabelaDeGrupos grupos={previa.grupos} />
        </Card>
      </section>
    </div>
  )
}

/** Matérias do lecionamento, na ordem em que a API devolveu. */
type MateriasDaPrevia = Array<{ componenteCurricularId: string; materiaNome: string }>

/**
 * Tabela de alunos, com uma coluna por matéria.
 *
 * Cada coluna de matéria mostra a síntese **daquela matéria** (média ponderada dos
 * componentes dela) e a última a média simples entre elas. As duas contas convividem
 * na tela de propósito: é o que deixa o professor conferir o número à mão contra
 * os lançamentos, que é o critério de aceite da Etapa 06.
 */
function TabelaDeAlunos({ previa, materias }: { previa: PreviaDoAluno[]; materias: MateriasDaPrevia }) {
  const colunas: TableColumn<PreviaDoAluno>[] = [
    {
      key: 'aluno',
      header: 'Aluno',
      className: 'whitespace-nowrap',
      cell: (linha) => (
        <span>
          <span className="font-medium text-neutral-800">{linha.nome}</span>
          <span className="text-neutral-500 block text-xs">#{linha.codigoMatricula}</span>
        </span>
      ),
    },
    ...materias.map((materia) => ({
      key: materia.componenteCurricularId,
      header: materia.materiaNome,
      align: 'right' as const,
      cell: (linha: PreviaDoAluno) => (
        <span className="tabular-nums">
          {formatarSintese(sinteseNaMateria(linha, materia.componenteCurricularId))}
        </span>
      ),
    })),
    {
      key: 'bimestral',
      header: 'Síntese do bimestre',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (linha) => (
        <span className="text-primary-700 font-semibold tabular-nums">
          {formatarSintese(linha.valor)}
        </span>
      ),
    },
  ]

  return (
    <Table
      columns={colunas}
      rows={previa}
      rowKey={(linha) => linha.alunoId}
      emptyMessage="Nenhum aluno para mostrar."
    />
  )
}

/** A síntese do aluno numa matéria, ou 0 se a lista vier sem ela. */
function sinteseNaMateria(linha: PreviaDoAluno, componenteCurricularId: string): number {
  return (
    linha.porMateria.find((materia) => materia.componenteCurricularId === componenteCurricularId)
      ?.valor ?? 0
  )
}

/**
 * Tabela de grupos, com a média das sínteses dos integrantes.
 *
 * Grupo sem integrante no bimestre mostra "—" e não 0: o encerramento não grava
 * síntese para ele, e ele fica fora do ranking parcial. Um 0 ali seria um número
 * que nunca vai existir.
 */
function TabelaDeGrupos({ grupos }: { grupos: PreviaDoGrupo[] }) {
  const colunas: TableColumn<PreviaDoGrupo>[] = [
    {
      key: 'grupo',
      header: 'Grupo',
      cell: (linha) => <span className="font-medium text-neutral-800">{linha.nome}</span>,
    },
    {
      key: 'integrantes',
      header: 'Integrantes',
      align: 'right',
      className: 'w-32',
      cell: (linha) => (
        <Badge tone="neutro">
          {linha.integrantes} {linha.integrantes === 1 ? 'integrante' : 'integrantes'}
        </Badge>
      ),
    },
    {
      key: 'bimestral',
      header: 'Síntese do bimestre',
      align: 'right',
      className: 'whitespace-nowrap',
      cell: (linha) =>
        linha.valor === null ? (
          <span className="text-neutral-400">—</span>
        ) : (
          <span className="text-primary-700 font-semibold tabular-nums">
            {formatarSintese(linha.valor)}
          </span>
        ),
    },
  ]

  return (
    <Table
      columns={colunas}
      rows={grupos}
      rowKey={(linha) => linha.grupoId}
      emptyMessage="Nenhum grupo nesta competição ainda."
    />
  )
}
