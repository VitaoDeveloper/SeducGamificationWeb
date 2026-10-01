import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  bimestre,
  linhaDeAluno,
  linhaDeGrupo,
  rankingDeGrupo,
  rankingIndividual,
  rankingIndividualDaCompeticao,
  rankingsDaCompeticao,
  rankingsRecusados,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from '../competicoes/competicoes.tipos'
import { MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO } from './rankings.api'
import { RankingDaCompeticao } from './RankingDaCompeticao'
import { TIPO_RANKING } from './rankings.tipos'

const COMPETICAO_ID = 'comp-1'

/**
 * Um bimestre encerrado e um aberto.
 *
 * O encerrado existe porque o ranking parcial só tem o que mostrar depois que a
 * síntese é gravada — sem ele a aba abre no aviso de "nenhum bimestre
 * encerrado", e nenhum dos testes abaixo chegaria às tabelas.
 */
const BIMESTRES = [
  bimestre({ id: 'b1', competicaoId: COMPETICAO_ID, numero: 1, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
  bimestre({ id: 'b2', competicaoId: COMPETICAO_ID, numero: 2, situacao: SITUACAO_BIMESTRE.ABERTO }),
]

function renderizar(visaoInicial?: (typeof TIPO_RANKING)[keyof typeof TIPO_RANKING]) {
  return renderComSessao(
    <RankingDaCompeticao
      competicaoId={COMPETICAO_ID}
      bimestres={BIMESTRES}
      visaoInicial={visaoInicial}
    />,
  )
}

describe('RankingDaCompeticao', () => {
  it('destaca as equipes empatadas com a posição repetida, nas três visões', async () => {
    const pessoa = userEvent.setup()
    server.use(
      rankingsDaCompeticao({
        parcial: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          tipo: TIPO_RANKING.PARCIAL,
          bimestreId: 'b1',
          itens: [
            linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 8.2, empate: true }),
            linhaDeGrupo({ grupoId: 'g2', nome: 'Beta', posicao: 1, valor: 8.2, empate: true }),
          ],
        }),
        anual: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 33.1 })],
        }),
      }),
      rankingIndividualDaCompeticao(
        rankingIndividual({
          competicaoId: COMPETICAO_ID,
          itens: [linhaDeAluno({ alunoId: 'a1', nome: 'Ana', posicao: 1, valor: 9 })],
        }),
      ),
    )

    renderizar()

    // A posição vem repetida da API e o ícone ao lado é o reforço: os dois
    // aparecem nas duas equipes que fecharam com a mesma nota.
    const alfa = await screen.findByRole('row', { name: /Alfa/ })
    expect(within(alfa).getByText('1º')).toBeInTheDocument()
    expect(within(alfa).getByText('empate')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Beta/ })).getByText('empate')).toBeInTheDocument()

    // A troca de visão é o que a barra de abas da competição controla; aqui ela
    // precisa levar à tabela certa, e não repetir a do parcial.
    await pessoa.click(screen.getByRole('tab', { name: 'Anual' }))
    expect(await screen.findByRole('columnheader', { name: 'Equipe' })).toBeInTheDocument()
    expect(await screen.findByText('Alfa')).toBeInTheDocument()

    await pessoa.click(screen.getByRole('tab', { name: 'Individual' }))
    expect(within(await screen.findByRole('row', { name: /Ana/ })).getByText('1º')).toBeInTheDocument()
  })

  it('avisa que o ranking anual ainda é parcial quando faltam bimestres', async () => {
    server.use(
      rankingsDaCompeticao({
        anual: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          bimestresEncerrados: 2,
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 16.4 })],
        }),
      }),
    )

    renderizar(TIPO_RANKING.ANUAL)

    expect(
      await screen.findByText('Resultado parcial — 2 de 4 bimestres encerrados. As posições acima ainda podem mudar.'),
    ).toBeInTheDocument()
  })

  it('avisa que o ranking individual ainda é parcial quando faltam bimestres', async () => {
    server.use(
      rankingIndividualDaCompeticao(
        rankingIndividual({
          competicaoId: COMPETICAO_ID,
          bimestresEncerrados: 1,
          itens: [linhaDeAluno({ alunoId: 'a1', nome: 'Ana', posicao: 1, valor: 8.4 })],
        }),
      ),
    )

    renderizar(TIPO_RANKING.INDIVIDUAL)

    expect(
      await screen.findByText('Resultado parcial — 1 de 4 bimestres encerrados. As posições acima ainda podem mudar.'),
    ).toBeInTheDocument()
  })

  it('não avisa de parcialidade quando os quatro bimestres estão encerrados', async () => {
    server.use(
      rankingsDaCompeticao({
        anual: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          bimestresEncerrados: 4,
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 33.1 })],
        }),
      }),
    )

    renderizar(TIPO_RANKING.ANUAL)

    // Espera a tabela carregar para não passar por acidente no estado vazio.
    await screen.findByText('Alfa')
    expect(screen.queryByText(/Resultado parcial/)).not.toBeInTheDocument()
  })

  it('abre direto na visão pedida, como o atalho do fim da competição', async () => {
    server.use(
      rankingsDaCompeticao({
        anual: rankingDeGrupo({
          competicaoId: COMPETICAO_ID,
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alfa', posicao: 1, valor: 33.1 })],
        }),
      }),
    )

    renderizar(TIPO_RANKING.ANUAL)

    expect(screen.getByRole('tab', { name: 'Anual' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText('Alfa')).toBeInTheDocument()
  })

  it('marca a linha do aluno logado no ranking individual', async () => {
    server.use(
      rankingIndividualDaCompeticao(
        rankingIndividual({
          competicaoId: COMPETICAO_ID,
          itens: [
            linhaDeAluno({ alunoId: 'a1', nome: 'Ana', posicao: 1, valor: 9 }),
            linhaDeAluno({ alunoId: 'a2', nome: 'Bia', posicao: 2, valor: 7 }),
          ],
        }),
      ),
    )

    renderComSessao(
      <RankingDaCompeticao
        competicaoId={COMPETICAO_ID}
        bimestres={BIMESTRES}
        visaoInicial={TIPO_RANKING.INDIVIDUAL}
        alunoId="a1"
        rotuloDeVoce="Você"
      />,
    )

    const ana = await screen.findByRole('row', { name: /Ana/ })
    expect(within(ana).getByText('Você')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Bia/ })).queryByText('Você')).not.toBeInTheDocument()
  })

  it('traduz o 403 em mensagem amigável e mantém a página de pé', async () => {
    server.use(...rankingsRecusados())

    renderizar()

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO)).toBeInTheDocument()
    // O erro é da chamada, não da tela: as visões continuam ali para nova tentativa.
    expect(screen.getByRole('tab', { name: 'Anual' })).toBeInTheDocument()
  })

  it('mostra o aviso de parcial indisponível sem esconder o seletor de visões', async () => {
    // Nenhum bimestre encerrado: não há síntese e, portanto, não há parcial. O
    // anual e o individual continuam alcançáveis — é justamente no começo da
    // competição que o professor quer vê-los.
    renderComSessao(
      <RankingDaCompeticao
        competicaoId={COMPETICAO_ID}
        bimestres={[
          bimestre({ id: 'b1', competicaoId: COMPETICAO_ID, numero: 1, situacao: SITUACAO_BIMESTRE.ABERTO }),
        ]}
      />,
    )

    expect(await screen.findByText('Nenhum bimestre encerrado ainda.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Anual' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Individual' })).toBeInTheDocument()
  })
})
