import { Alert, Badge, Card, Table } from '../../components'
import type { TableColumn } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { rotuloDoBimestre } from './bimestres'
import type { ResultadoDoEncerramento, SinteseOficialDoAluno, SinteseOficialDoGrupo } from './encerramento.tipos'

/** Cabeçalho de seção dentro do painel, no mesmo peso dos títulos das abas. */
const TITULO_DA_SECAO =
  'text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase'

const FORMATO_DE_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** Instante do encerramento, no fuso de quem está olhando: "10/04/26, 18:00". */
function formatarDataHora(iso: string): string {
  return FORMATO_DE_DATA_HORA.format(new Date(iso))
}

export interface SintesesOficiaisProps {
  resultado: ResultadoDoEncerramento
}

/**
 * As sínteses que a API gravou no encerramento, no lugar da prévia de cálculo.
 *
 * Substitui a `PreviaDaSintese` justamente porque os dois painéis mostram o mesmo
 * nome de coluna com garantias diferentes: a prévia é uma conta feita no
 * navegador que muda a cada nota lançada, e a síntesis oficial é o que está
 * gravado e congelado. Deixar os dois visíveis ao mesmo tempo daria ao professor
 * dois números para a mesma nota, sem meio de saber qual é o que vale.
 *
 * Os dados vêm da própria resposta do encerramento — a mesma que gravou as
 * sínteses — e não de um cálculo do front: o valor mostrado aqui é literalmente
 * o que o ranking parcial vai usar.
 *
 * A equipe sem integrante aparece como ausência, e não como 0: o encerramento
 * não grava síntese para ela, então um 0 ali seria um número que nunca existiu.
 */
export function SintesesOficiais({ resultado }: SintesesOficiaisProps) {
  const rotulo = rotuloDoBimestre(resultado.numero)
  const semNinguem = resultado.sinteseAluno.length === 0 && resultado.sinteseGrupo.length === 0

  return (
    <div className="space-y-6">
      <Alert tone="sucesso">
        <p className="font-medium">
          Síntese oficial do {rotulo}, gravada pela API em{' '}
          {formatarDataHora(resultado.encerradoEm)}.
        </p>
        <p className="mt-1">
          {resultado.totais.alunos}{' '}
          {resultado.totais.alunos === 1 ? 'aluno' : 'alunos'} em{' '}
          {resultado.totais.materias}{' '}
          {resultado.totais.materias === 1 ? 'matéria' : 'matérias'} e{' '}
          {resultado.totais.grupos} {resultado.totais.grupos === 1 ? 'equipe' : 'equipes'}. Estes
          valores estão congelados: lançamentos, pesos e composição dos grupos não podem mais
          mudar.
        </p>
      </Alert>

      {semNinguem ? (
        <Alert tone="info">
          O encerramento foi gravado, mas a API não devolveu a síntese de nenhum aluno nem de
          nenhuma equipe neste bimestre — não há o que mostrar aqui. Se a sala tem alunos
          matriculados, confira isso antes de usar os números em relatório.
        </Alert>
      ) : null}

      {resultado.sinteseAluno.length > 0 ? (
        <section aria-labelledby="titulo-sintese-alunos" className="space-y-3">
          <h2 id="titulo-sintese-alunos" className={TITULO_DA_SECAO}>
            Por aluno
          </h2>

          <Card bare>
            <TabelaDeAlunos sinteses={resultado.sinteseAluno} />
          </Card>
        </section>
      ) : null}

      {resultado.sinteseGrupo.length > 0 ? (
        <section aria-labelledby="titulo-sintese-grupos" className="space-y-3">
          <h2 id="titulo-sintese-grupos" className={TITULO_DA_SECAO}>
            Por equipe
          </h2>

          <Card bare>
            <TabelaDeGrupos sinteses={resultado.sinteseGrupo} />
          </Card>

          <p className="text-neutral-500 text-sm">
            Equipe sem integrante no bimestre não entra na conta e não aparece aqui.
          </p>
        </section>
      ) : null}
    </div>
  )
}

/** Uma coluna só: a síntese bimestral que a API gravou, com o nome de quem é. */
function TabelaDeAlunos({ sinteses }: { sinteses: SinteseOficialDoAluno[] }) {
  const colunas: TableColumn<SinteseOficialDoAluno>[] = [
    {
      key: 'aluno',
      header: 'Aluno',
      cell: (linha) => <span className="font-medium text-neutral-800">{linha.nome}</span>,
    },
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
      rows={sinteses}
      rowKey={(linha) => linha.alunoId}
      emptyMessage="Nenhum aluno com síntese neste bimestre."
    />
  )
}

/** Equipe, quantos integrantes tinha no bimestre e a síntese gravada. */
function TabelaDeGrupos({ sinteses }: { sinteses: SinteseOficialDoGrupo[] }) {
  const colunas: TableColumn<SinteseOficialDoGrupo>[] = [
    {
      key: 'grupo',
      header: 'Equipe',
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
      rows={sinteses}
      rowKey={(linha) => linha.grupoId}
      emptyMessage="Nenhuma equipe com síntese neste bimestre."
    />
  )
}
