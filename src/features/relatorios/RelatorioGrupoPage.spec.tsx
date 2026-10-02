import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  bimestreDoGrupo,
  relatorioComparativoDoGrupo,
  relatorioComparativoDoGrupoHandler,
  relatorioDoGrupo,
  relatorioDoGrupoHandler,
  relatoriosRecusados,
} from '../../test/handlers'
import { MENSAGEM_DE_ACESSO_AO_RELATORIO } from './relatorios.api'
import { RelatorioComparativoGrupoPage } from './RelatorioComparativoGrupoPage'
import { RelatorioGrupoPage } from './RelatorioGrupoPage'
import { ROTA_RELATORIO_COMPARATIVO_DO_GRUPO, ROTA_RELATORIO_DO_GRUPO } from './rotas'

const GRUPO_ID = 'g1'

function renderizarIndividuo(rota = `/grupos/${GRUPO_ID}/relatorio`) {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_RELATORIO_DO_GRUPO} element={<RelatorioGrupoPage />} />
    </Routes>,
    rota,
  )
}

function renderizarComparativo(rota = `/grupos/${GRUPO_ID}/relatorio-comparativo`) {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_RELATORIO_COMPARATIVO_DO_GRUPO} element={<RelatorioComparativoGrupoPage />} />
    </Routes>,
    rota,
  )
}

describe('RelatorioGrupoPage', () => {
  it('mostra a soma das sínteses em bloco próprio, de 0 a 40, longe do gráfico', async () => {
    server.use(relatorioDoGrupoHandler(relatorioDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })))

    renderizarIndividuo()

    // A soma é o número que o gráfico — de eixo em 0 a 10 — não pode conter, e por
    // isso ela vem em um bloco com nome de escala e teto próprios.
    expect(await screen.findByRole('heading', { name: 'Soma das sínteses' })).toBeInTheDocument()
    expect(screen.getByText('15.75')).toBeInTheDocument()
    expect(screen.getByText('/ 40')).toBeInTheDocument()
    expect(screen.queryByText('/ 10')).not.toBeInTheDocument()

    // O bloco diz de onde o total saiu: as parcelas são as sínteses que a API
    // devolveu, e é essa linha que impede a leitura de "15.75" como nota.
    expect(screen.getByText('1º: 8.25')).toBeInTheDocument()
    expect(screen.getByText('2º: 7.50')).toBeInTheDocument()
    expect(screen.getByText('3º: —')).toBeInTheDocument()

    // E a escala do gráfico continua sendo a da síntese, dita ao lado dele.
    const grafico = screen.getByRole('table', { name: /Síntese da Equipe Alfa por bimestre/ })
    expect(within(grafico).getByText('8.25')).toBeInTheDocument()
    expect(within(grafico).getByText('7.50')).toBeInTheDocument()
    expect(within(grafico).getByText('—')).toBeInTheDocument()
  })

  it('lista os integrantes de cada bimestre, porque a equipe muda no meio do ano', async () => {
    server.use(
      relatorioDoGrupoHandler(
        relatorioDoGrupo({
          grupoId: GRUPO_ID,
          nome: 'Equipe Alfa',
          bimestres: [
            bimestreDoGrupo({
              numero: 1,
              integrantes: [
                { alunoId: 'a1', nome: 'Ana Souza', valor: 8.25 },
                { alunoId: 'a2', nome: 'Bruno Lima', valor: 8.25 },
              ],
            }),
            bimestreDoGrupo({
              numero: 2,
              integrantes: [{ alunoId: 'a2', nome: 'Bruno Lima', valor: 7.5 }],
            }),
          ],
        }),
      ),
    )

    renderizarIndividuo()

    expect(await screen.findByRole('heading', { name: '1º bimestre — integrantes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2º bimestre — integrantes' })).toBeInTheDocument()

    // Ana está no 1º bimestre e não no 2º: uma tabela única mentiria sobre isso.
    expect(screen.getByRole('row', { name: /Ana Souza/ })).toBeInTheDocument()
    const segundo = screen
      .getByRole('heading', { name: '2º bimestre — integrantes' })
      .closest('section') as HTMLElement
    expect(within(segundo).queryByText('Ana Souza')).not.toBeInTheDocument()
  })

  it('avisa que ainda não há síntese quando o grupo não pontuou em nenhum bimestre', async () => {
    server.use(
      relatorioDoGrupoHandler(
        relatorioDoGrupo({
          grupoId: GRUPO_ID,
          nome: 'Equipe Alfa',
          pontuacaoFinal: null,
          bimestres: [bimestreDoGrupo({ numero: 1, valor: null, integrantes: [] })],
        }),
      ),
    )

    renderizarIndividuo()

    expect(
      await screen.findByText('Nenhuma síntese gravada ainda para o grupo Equipe Alfa.'),
    ).toBeInTheDocument()
    // A soma sem valor é traço, e não 0: zero é pontuação, ausência de pontuação é
    // outra coisa.
    expect(screen.getByText('1º: —')).toBeInTheDocument()
    expect(screen.getByText('/ 40')).toBeInTheDocument()
  })

  it('trata o 403 com mensagem amigável, sem mostrar o detalhe técnico', async () => {
    server.use(...relatoriosRecusados())

    renderizarIndividuo()

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_AO_RELATORIO)).toBeInTheDocument()
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para as salas' })).toBeInTheDocument()
  })

  it('leva ao relatório comparado, sem inventar parâmetro que a rota não tem', async () => {
    server.use(relatorioDoGrupoHandler(relatorioDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })))

    renderizarIndividuo()

    expect(await screen.findByRole('link', { name: 'Comparar com os outros grupos' })).toHaveAttribute(
      'href',
      `/grupos/${GRUPO_ID}/relatorio-comparativo`,
    )
  })
})

describe('RelatorioComparativoGrupoPage', () => {
  /** A seção das somas, para as consultas que precisam sair do gráfico. */
  async function secaoDasSomas() {
    return screen.findByRole('region', { name: 'Pontuação final por grupo' })
  }

  it('compara as sínteses no gráfico e as somas numa tabela separada', async () => {
    server.use(
      relatorioComparativoDoGrupoHandler(
        relatorioComparativoDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' }),
      ),
    )

    renderizarComparativo()

    expect(await screen.findByRole('heading', { name: 'Soma das sínteses' })).toBeInTheDocument()

    // O gráfico tem uma linha por grupo e é da escala da síntese.
    const grafico = screen.getByRole('table', { name: /Síntese de cada grupo por bimestre/ })
    expect(within(grafico).getByRole('columnheader', { name: 'Equipe Alfa' })).toBeInTheDocument()
    expect(within(grafico).getByRole('columnheader', { name: 'Equipe Beta' })).toBeInTheDocument()

    // A soma de cada grupo fica numa tabela com o teto no cabeçalho da coluna — a
    // escala de 0 a 40 ao lado da de 0 a 10, mas nunca no mesmo lugar.
    const somas = await secaoDasSomas()
    expect(
      within(somas).getByRole('columnheader', { name: 'Pontuação final (soma, até 40)' }),
    ).toBeInTheDocument()
    const alfa = within(somas).getByRole('row', { name: /Equipe Alfa/ })
    expect(within(alfa).getByText('15.75')).toBeInTheDocument()
    expect(within(alfa).getByText('Este grupo')).toBeInTheDocument()
  })

  it('soma o próprio grupo ao comparativo, que a API devolve sem ele', async () => {
    server.use(
      relatorioComparativoDoGrupoHandler(
        relatorioComparativoDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' }),
      ),
    )

    renderizarComparativo()

    const somas = await secaoDasSomas()
    // A API manda em `comparativo` só os outros grupos: sem somar o próprio aqui, o
    // gráfico mostraria a competição sem o time de quem está lendo.
    expect(within(somas).getByRole('row', { name: /Equipe Alfa/ })).toBeInTheDocument()
    expect(within(somas).getByRole('row', { name: /Equipe Beta/ })).toBeInTheDocument()
  })

  it('avisa que não há com o que comparar quando a competição tem um grupo só', async () => {
    server.use(
      relatorioComparativoDoGrupoHandler(
        relatorioComparativoDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa', comparativo: [] }),
      ),
    )

    renderizarComparativo()

    expect(
      await screen.findByText(/A competição tem apenas este grupo, então não há com o que comparar/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /Síntese de cada grupo/ })).not.toBeInTheDocument()
  })

  it('trata o 403 com mensagem amigável, sem mostrar o detalhe técnico', async () => {
    server.use(...relatoriosRecusados())

    renderizarComparativo()

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_AO_RELATORIO)).toBeInTheDocument()
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
  })
})