import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { espiarNoDownload } from '../../test/download'
import type { EspiaDeDownload } from '../../test/download'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  bimestreDoAluno,
  relatorioIndividual,
  relatorioIndividualDoAluno,
  relatoriosEmPdf,
  relatoriosRecusados,
} from '../../test/handlers'
import { MENSAGEM_DE_ACESSO_AO_RELATORIO } from './relatorios.api'
import { RelatorioIndividualPage } from './RelatorioIndividualPage'
import { ROTA_RELATORIO_INDIVIDUAL } from './rotas'

const ALUNO_ID = 'a1'

/** O espião do download só é montado no teste da Etapa 11 que o usa. */
let download: EspiaDeDownload | null = null

beforeEach(() => {
  download = null
})

afterEach(() => {
  download?.restaurar()
})

/**
 * A tela é montada por uma `Route`, e não direto.
 *
 * É o `alunoId` da URL que diz de quem é o relatório, e ele sai de `useParams` —
 * renderizar o componente fora de uma rota o deixaria sem id, o hook resolveria
 * `null` sem buscar, e o teste passaria a provar o caminho sem id.
 */
function renderizar(rota = `/alunos/${ALUNO_ID}/relatorio-individual`) {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_RELATORIO_INDIVIDUAL} element={<RelatorioIndividualPage />} />
    </Routes>,
    rota,
  )
}

describe('RelatorioIndividualPage', () => {
  it('mostra a média em destaque e as sínteses bimestrais em escala de 0 a 10', async () => {
    server.use(
      relatorioIndividualDoAluno(
        relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' }),
      ),
    )

    renderizar()

    expect(await screen.findByRole('heading', { name: 'Média das sínteses' })).toBeInTheDocument()

    // A média é o número da API, com o teto da escala escrito ao lado: é o teto que
    // impede que o valor seja lido como uma soma.
    expect(screen.getByText('7.88')).toBeInTheDocument()
    expect(screen.getByText('/ 10')).toBeInTheDocument()
    expect(screen.queryByText('/ 40')).not.toBeInTheDocument()

    // O gráfico é da escala da síntese, e a frase que diz isso fica na descrição.
    expect(screen.getByText(/escala de 0 a 10/)).toBeInTheDocument()

    // As duas sínteses gravadas chegam; o bimestre aberto aparece como traço, e não
    // como 0 — o que a tabela de valores (sr-only) é quem escreve.
    const valores = screen.getByRole('table', { name: /Síntese do aluno por bimestre/ })
    expect(within(valores).getByText('8.25')).toBeInTheDocument()
    expect(within(valores).getByText('7.50')).toBeInTheDocument()
    expect(within(valores).getByText('—')).toBeInTheDocument()
  })

  it('detalha as matérias de cada bimestre', async () => {
    server.use(
      relatorioIndividualDoAluno(
        relatorioIndividual({
          alunoId: ALUNO_ID,
          nome: 'Ana Souza',
          bimestres: [
            bimestreDoAluno({
              numero: 1,
              valor: 8.25,
              materias: [
                { componenteCurricularId: 'mat-1', nome: 'Programação Web', valor: 8 },
                { componenteCurricularId: 'mat-2', nome: 'Matemática', valor: 8.5 },
              ],
            }),
          ],
        }),
      ),
    )

    renderizar()

    expect(
      await screen.findByRole('heading', { name: '1º bimestre — por matéria' }),
    ).toBeInTheDocument()

    const matematica = await screen.findByRole('row', { name: /Matemática/ })
    expect(within(matematica).getByText('8.50')).toBeInTheDocument()
  })

  it('avisa que ainda não há síntese quando nenhum bimestre foi encerrado', async () => {
    server.use(
      relatorioIndividualDoAluno(
        relatorioIndividual({
          alunoId: ALUNO_ID,
          nome: 'Ana Souza',
          pontuacaoFinal: null,
          bimestres: [bimestreDoAluno({ numero: 1, valor: null, materias: [] })],
        }),
      ),
    )

    renderizar()

    expect(
      await screen.findByText('Nenhuma síntese gravada ainda para Ana Souza nesta competição.'),
    ).toBeInTheDocument()
    // Sem síntese não há gráfico: a escala de 0 a 10 seria a única coisa na tela.
    expect(screen.queryByRole('table', { name: /valores/ })).not.toBeInTheDocument()
  })

  it('trata o 403 com mensagem amigável, sem mostrar o detalhe técnico', async () => {
    server.use(...relatoriosRecusados())

    renderizar()

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_AO_RELATORIO)).toBeInTheDocument()

    // O corpo cru do NestJS não vaza para a tela, e a página continua de pé com o
    // caminho de volta — é o que separa "recusado" de "quebrado".
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para as salas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('leva ao relatório comparado ao grupo, mantendo a competição', async () => {
    server.use(
      relatorioIndividualDoAluno(
        relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' }),
      ),
    )

    renderizar(`/alunos/${ALUNO_ID}/relatorio-individual?competicaoId=comp-1`)

    expect(await screen.findByRole('link', { name: 'Comparar com o grupo' })).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_ID}/relatorio-comparativo-grupo?competicaoId=comp-1`,
    )
  })

  it('oferece o PDF no cabeçalho, ao lado do link para o outro relatório', async () => {
    server.use(
      relatorioIndividualDoAluno(relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' })),
      ...relatoriosEmPdf(),
    )
    download = espiarNoDownload()

    renderizar()

    // O botão só aparece com o relatório na tela: sem o id e sem o nome não há nem
    // rota nem nome de arquivo, e um botão que falha ao clique é pior que um
    // botão que não existe.
    await screen.findByRole('heading', { name: 'Relatório individual' })
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Comparar com o grupo' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText('PDF gerado. O download começou.')).toBeInTheDocument()
    expect(download?.baixados[0]?.nomeDoArquivo).toBe('relatorio-individual-ana-souza.pdf')
  })
})