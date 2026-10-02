import { Link } from 'react-router-dom'

import { Alert, Card, CardTitle } from '../../components'
import { TIPO_USUARIO } from '../../lib/sessao'
import { useAuth } from '../auth'

import { rotaDoRelatorioComparativoDoAluno, rotaDoRelatorioIndividual } from './rotas'

export interface RelatoriosDoAlunoProps {
  /** Competição do link do dashboard; `undefined` quando o link não trouxe uma. */
  competicaoId: string | undefined
}

const LINK = 'text-primary-700 hover:text-primary-800 text-sm font-medium underline underline-offset-2'

/**
 * Os relatórios do aluno, no dashboard dele.
 *
 * **O `alunoId` sai da sessão, nunca da URL.** É a diferença entre o link levar o
 * aluno ao relatório dele e levar ao relatório de outra pessoa: um id na query
 * (`?alunoId=`) transformaria o dashboard em um gerador de link para o relatório
 * de qualquer pessoa, e a API recusaria com `403` — mas a tela já teria oferecido
 * o caminho. Com o id da sessão, o link só pode apontar para um lugar: o relatório
 * do aluno logado.
 *
 * Os dois relatórios que o aluno alcança são os dois que a API abre para ele — o
 * individual e o comparado ao grupo dele (`README-API.md`, seção 11.13). Os
 * relatórios de grupo **não** aparecem, e não por esquecimento: eles são
 * endereçados por `grupoId`, e não existe endpoint que diga ao aluno a que grupo
 * ele pertence. Quando a API tiver "minhas competições" e o grupo do aluno, é aqui
 * que o terceiro link nasce.
 */
export function RelatoriosDoAluno({ competicaoId }: RelatoriosDoAlunoProps) {
  const { usuario } = useAuth()
  const alunoId = usuario?.tipo === TIPO_USUARIO.ALUNO ? usuario.id : undefined

  if (!alunoId) return null

  if (!competicaoId) {
    return (
      <Alert tone="info">
        Os relatórios aparecem quando esta tela é aberta pelo link da competição da
        sua sala.
      </Alert>
    )
  }

  return (
    <Card>
      <CardTitle>Meus relatórios</CardTitle>
      <p className="text-neutral-600 mt-1.5 mb-4 text-sm">
        Os dois relatórios são só seus. Cada um mostra o ano bimestre a bimestre, e a
        comparação mostra a sua linha junto com a dos colegas do grupo de cada
        bimestre.
      </p>

      <ul className="space-y-2">
        <li>
          <Link className={LINK} to={rotaDoRelatorioIndividual(alunoId, competicaoId)}>
            Meu relatório individual
          </Link>
        </li>
        <li>
          <Link
            className={LINK}
            to={rotaDoRelatorioComparativoDoAluno(alunoId, competicaoId)}
          >
            Meu relatório comparado ao grupo
          </Link>
        </li>
      </ul>
    </Card>
  )
}