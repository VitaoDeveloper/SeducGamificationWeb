import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  relatorioComparativoDoAluno,
  relatorioComparativoDoAlunoHandler,
  relatoriosRecusados,
} from '../../test/handlers'
import { MENSAGEM_DE_ACESSO_AO_RELATORIO } from './relatorios.api'
import { RelatorioComparativoAlunoPage } from './RelatorioComparativoAlunoPage'
import { ROTA_RELATORIO_COMPARATIVO_DO_ALUNO } from './rotas'

const ALUNO_ID = 'a1'

function renderizar(rota = `/alunos/${ALUNO_ID}/relatorio-comparativo-grupo`) {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_RELATORIO_COMPARATIVO_DO_ALUNO} element={<RelatorioComparativoAlunoPage />} />
    </Routes>,
    rota,
  )
}

describe('RelatorioComparativoAlunoPage', () => {
  it('compara a linha do aluno com a dos colegas e diz com quem ele estava', async () => {
    server.use(
      relatorioComparativoDoAlunoHandler(
        relatorioComparativoDoAluno({ alunoId: ALUNO_ID, nome: 'Ana Souza' }),
      ),
    )

    renderizar()

    // A média do aluno continua em escala de 0 a 10 — a soma do grupo não aparece
    // nesta tela, e é por isso que o teto escrito ao lado do número importa.
    expect(await screen.findByRole('heading', { name: 'Média das sínteses' })).toBeInTheDocument()
    expect(screen.getByText('7.88')).toBeInTheDocument()
    expect(screen.getByText('/ 10')).toBeInTheDocument()

    // As duas séries: o próprio aluno e o colega. A API lista em `colegasDeGrupo`
    // só os *outros*, então a linha do aluno na legenda prova que a tela o somou.
    const grafico = screen.getByRole('table', { name: /Ana Souza e o grupo, por bimestre/ })
    expect(within(grafico).getByRole('columnheader', { name: 'Ana Souza' })).toBeInTheDocument()
    expect(within(grafico).getByRole('columnheader', { name: 'Bruno Lima' })).toBeInTheDocument()

    // E quem ele era em cada bimestre fica escrito: comparação sem nome de time não
    // responde "ele foi justo nesse time?".
    expect(screen.getByText('1º bimestre: Equipe Alfa')).toBeInTheDocument()
    expect(screen.getByText('3º bimestre: sem grupo')).toBeInTheDocument()
  })

  it('abre um intervalo no bimestre em que o colega estava noutro grupo', async () => {
    /*
     * Só o 1º bimestre tem colega; no 2º o aluno mudou de equipe. É o caso que a
     * junção por `alunoId` resolve: o colega continua na série dele, com o 2º
     * bimestre em branco.
     */
    const comparativo = relatorioComparativoDoAluno({ alunoId: ALUNO_ID, nome: 'Ana Souza' })
    const primeiro = comparativo.bimestres[0]!

    server.use(
      relatorioComparativoDoAlunoHandler(
        relatorioComparativoDoAluno({
          alunoId: ALUNO_ID,
          nome: 'Ana Souza',
          bimestres: [
            primeiro,
            {
              bimestreId: 'comp-1-b2',
              numero: 2,
              valor: 7.5,
              materias: [],
              grupo: { grupoId: 'g2', nome: 'Equipe Beta' },
              colegasDeGrupo: [],
            },
          ],
        }),
      ),
    )

    renderizar()

    const grafico = await screen.findByRole('table', { name: /Ana Souza e o grupo/ })
    // No 2º bimestre o colega saiu: a célula é o traço, e não 0 — costurar a linha
    // sugeriria convivência onde não houve.
    const celulas = within(grafico).getAllByRole('cell')
    expect(celulas.some((celula) => celula.textContent === '—')).toBe(true)
    expect(screen.getByText('2º bimestre: Equipe Beta')).toBeInTheDocument()
  })

  it('avisa que não há colega para comparar, em vez de mostrar um gráfico de uma linha', async () => {
    server.use(
      relatorioComparativoDoAlunoHandler(
        relatorioComparativoDoAluno({
          alunoId: ALUNO_ID,
          nome: 'Ana Souza',
          bimestres: [
            {
              bimestreId: 'comp-1-b1',
              numero: 1,
              valor: 8.25,
              materias: [],
              grupo: null,
              colegasDeGrupo: [],
            },
          ],
        }),
      ),
    )

    renderizar()

    expect(
      await screen.findByText('Nenhum colega de grupo para comparar.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /valores/ })).not.toBeInTheDocument()
  })

  it('trata o 403 com mensagem amigável, sem mostrar o detalhe técnico', async () => {
    server.use(...relatoriosRecusados())

    renderizar()

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_AO_RELATORIO)).toBeInTheDocument()
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para as salas' })).toBeInTheDocument()
  })

  it('leva ao relatório individual, mantendo a competição', async () => {
    server.use(
      relatorioComparativoDoAlunoHandler(
        relatorioComparativoDoAluno({ alunoId: ALUNO_ID, nome: 'Ana Souza' }),
      ),
    )

    renderizar(`/alunos/${ALUNO_ID}/relatorio-comparativo-grupo?competicaoId=comp-1`)

    expect(await screen.findByRole('link', { name: 'Ver o relatório individual' })).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_ID}/relatorio-individual?competicaoId=comp-1`,
    )
  })
})