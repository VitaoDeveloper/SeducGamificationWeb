import { Link } from 'react-router-dom'

import { Card, Table } from '../../components'
import type { TableColumn } from '../../components'

import type { GrupoCompetidor } from '../competicoes/competicoes.tipos'
import type { Aluno } from '../salas/salas.tipos'

import {
  rotaDoRelatorioComparativoDoAluno,
  rotaDoRelatorioComparativoDoGrupo,
  rotaDoRelatorioDoGrupo,
  rotaDoRelatorioIndividual,
} from './rotas'

export interface RelatoriosDaCompeticaoProps {
  /** Competição em exibição: é ela que vai na query dos relatórios de aluno. */
  competicaoId: string
  /** Grupos da competição. */
  grupos: GrupoCompetidor[]
  /** Alunos da sala, que são os que a API aceita para relatório individual. */
  alunos: Aluno[]
  carregando?: boolean
}

const LINK = 'text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2'

/**
 * A central de relatórios da competição: os quatro, indexados por grupo e por
 * aluno.
 *
 * Existe porque os quatro relatórios são oito links e nenhum deles tem onde
 * aparecer sozinho: os dois do grupo na tela de grupos, os dois do aluno na
 * composição — e o professor quer "o relatório daquele aluno", não "o relatório do
 * aluno que estava no grupo vermelho do 2º bimestre". Uma lista por grupo e outra
 * por aluno, com os quatro relatórios de cada um, é o que fecha essa conta.
 *
 * **Só de professor.** As rotas da API abrem para o aluno apenas o próprio
 * relatório individual e o do próprio grupo, então esta aba nunca é montada para
 * ele — a `CompeticaoDetailPage` é do professor, e o dashboard do aluno tem o
 * bloco `RelatoriosDoAluno`, com os dois relatórios que a API libera.
 *
 * A `competicaoId` vai na query dos relatórios de aluno porque a API aceita
 * informes: só é obrigatória quando o aluno participa de mais de uma competição,
 * e é o `400` do "informe competicaoId" que a tela não deve provocar por omissão.
 */
export function RelatoriosDaCompeticao({
  competicaoId,
  grupos,
  alunos,
  carregando = false,
}: RelatoriosDaCompeticaoProps) {
  const colunasDeGrupos: TableColumn<GrupoCompetidor>[] = [
    {
      key: 'nome',
      header: 'Grupo',
      cell: (grupo) => <span className="font-medium text-neutral-800">{grupo.nome}</span>,
    },
    {
      key: 'relatorios',
      header: 'Relatórios',
      cell: (grupo) => (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link className={LINK} to={rotaDoRelatorioDoGrupo(grupo.id)}>
            Do grupo
          </Link>
          <Link className={LINK} to={rotaDoRelatorioComparativoDoGrupo(grupo.id)}>
            Comparado aos grupos
          </Link>
        </span>
      ),
    },
  ]

  const colunasDeAlunos: TableColumn<Aluno>[] = [
    {
      key: 'nome',
      header: 'Aluno',
      cell: (aluno) => <span className="font-medium text-neutral-800">{aluno.nome}</span>,
    },
    {
      key: 'relatorios',
      header: 'Relatórios',
      cell: (aluno) => (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link className={LINK} to={rotaDoRelatorioIndividual(aluno.id, competicaoId)}>
            Individual
          </Link>
          <Link className={LINK} to={rotaDoRelatorioComparativoDoAluno(aluno.id, competicaoId)}>
            Comparado ao grupo
          </Link>
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-relatorios-grupos" className="space-y-3">
        <h2
          id="titulo-relatorios-grupos"
          className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
        >
          Por grupo
        </h2>
        <Card bare>
          <Table
            columns={colunasDeGrupos}
            rows={grupos}
            rowKey={(grupo) => grupo.id}
            loading={carregando && grupos.length === 0}
            emptyMessage="Nenhum grupo nesta competição ainda."
          />
        </Card>
      </section>

      <section aria-labelledby="titulo-relatorios-alunos" className="space-y-3">
        <h2
          id="titulo-relatorios-alunos"
          className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
        >
          Por aluno
        </h2>
        <Card bare>
          <Table
            columns={colunasDeAlunos}
            rows={alunos}
            rowKey={(aluno) => aluno.id}
            loading={carregando && alunos.length === 0}
            emptyMessage="Nenhum aluno matriculado nesta sala ainda."
          />
        </Card>
      </section>
    </div>
  )
}