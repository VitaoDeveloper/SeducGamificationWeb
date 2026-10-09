import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Link, Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import {
  API,
  ESCOLA_A,
  ESCOLA_B,
  PROFESSOR_DE_TESTE,
  TOKEN_DE_TESTE,
  aluno,
  bimestre,
  bimestresDaCompeticao,
  competicao,
  componentesDoBimestre as componentesDoBimestreResposta,
  desempateDaCompeticao,
  grupo,
  lancamento,
  lecionamento,
  listagemDeLancamentos,
  materiaFechada,
  membro,
  linhaDeGrupo,
  rankingDeGrupo,
  rankingsDaCompeticao,
  sala,
  salasDoProfessor,
  validacaoDePesos,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { GrupoComMembros } from './competicoes.tipos'
import { TIPO_RANKING } from '../rankings/rankings.tipos'
import { CompeticaoDetailPage } from './CompeticaoDetailPage'
import { ROTA_COMPETICAO_DETALHE, rotaDaCompeticao } from './rotas'
import { rotaDasCompeticoes } from '../salas/rotas'
import type { Lancamento } from './componentes-pontuacao.tipos'

const SALA = sala({ id: 'sala-1', nome: '2º DS', escola: ESCOLA_A })

const LECIONAMENTO = lecionamento({ id: 'lec-1', salaId: SALA.id })

const ALUNOS = [
  aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' }),
  aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' }),
]

const BIMESTRES = [
  bimestre({ id: 'b1', competicaoId: 'comp-1', numero: 1, situacao: SITUACAO_BIMESTRE.ABERTO }),
  bimestre({ id: 'b2', competicaoId: 'comp-1', numero: 2, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
  bimestre({ id: 'b3', competicaoId: 'comp-1', numero: 3, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
  bimestre({ id: 'b4', competicaoId: 'comp-1', numero: 4, situacao: SITUACAO_BIMESTRE.ENCERRADO }),
]

/*
 * Bimestres com datas encadeadas (um período por bimestre), com só o primeiro
 * aberto. `BIMESTRES` usa a data padrão da factory para os quatro — proposital
 * para as demais telas, mas inútil para a edição: os vizinhos precisam ter datas
 * distintas, senão a própria validação da tela barra a gravação antes de a API
 * ser chamada.
 */
const BIMESTRES_ENCADEADOS = bimestresDaCompeticao('comp-1').map((bimestre) =>
  bimestre.numero === 1 ? bimestre : { ...bimestre, situacao: SITUACAO_BIMESTRE.ENCERRADO },
)

const COMPETICAO = competicao({
  id: 'comp-1',
  nome: 'Copa do Conhecimento',
  lecionamentoId: LECIONAMENTO.id,
})

/** Uma matéria fechada em 100%, para as abas de componentes e lançamentos. */
const MATEMATICA_FECHADA = materiaFechada('mat-1', 'Matemática', ['Prova bimestral', 100])

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: {
      id: PROFESSOR_DE_TESTE,
      tipo: TIPO_USUARIO.PROFESSOR,
      codigoMatricula: '26001',
    },
  })
}

/** Grupos diferentes por bimestre: `Alpha` no b1 e `Beta` no b2. */
function grupos() {
  return http.get(`${API}/competicoes/:id/grupos`, ({ request }) => {
    const bimestreId = new URL(request.url).searchParams.get('bimestreId')

    if (bimestreId === 'b2') {
      const beta = grupo({ id: 'g2', nome: 'Beta', competicaoId: COMPETICAO.id })
      return HttpResponse.json({
        bimestreId: 'b2',
        grupos: [{ ...beta, membrosGrupos: [membro('g2', ALUNOS[0]!, 'b2')] }],
      })
    }

    const alpha = grupo({ id: 'g1', nome: 'Alpha', competicaoId: COMPETICAO.id })
    return HttpResponse.json({
      bimestreId: bimestreId ?? 'b1',
      grupos: [{ ...alpha, membrosGrupos: [] }],
    })
  })
}

/**
 * Cenário da página, com a listagem de pendências de desempate vazia.
 *
 * Desde a Etapa 09 a página busca as pendências na montagem, e a ausência do
 * handler faria a tela renderizar um aviso de falha que estes testes não estão
 * exercitando — um erro de cenário que se apresenta como erro de produto.
 */
function cenario() {
  return [
    http.get(`${API}/competicoes/:id`, () =>
      HttpResponse.json({ ...COMPETICAO, bimestres: BIMESTRES }),
    ),
    ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
    grupos(),
    ...desempateDaCompeticao([]),
  ]
}

/**
 * Cenário da página com o handler de grupos apontando para uma lista mutável.
 *
 * A lista é lida a cada requisição, para que renomear ou excluir um grupo mude o
 * que a recarga seguinte devolve — o mesmo papel das datas mutáveis nos testes de
 * edição de bimestre.
 */
function cenarioComGrupos(obterGrupos: () => GrupoComMembros[]) {
  return [
    http.get(`${API}/competicoes/:id`, () =>
      HttpResponse.json({ ...COMPETICAO, bimestres: BIMESTRES }),
    ),
    ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
    http.get(`${API}/competicoes/:id/grupos`, ({ request }) => {
      const bimestreId = new URL(request.url).searchParams.get('bimestreId')
      return HttpResponse.json({ bimestreId: bimestreId ?? 'b1', grupos: obterGrupos() })
    }),
    ...desempateDaCompeticao([]),
  ]
}

/** Um grupo sem integrantes no bimestre selecionado. */
function grupoVazio(id: string, nome: string): GrupoComMembros {
  return { ...grupo({ id, nome, competicaoId: COMPETICAO.id }), membrosGrupos: [] }
}

function renderizarDetalhe() {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
    </Routes>,
    rotaDaCompeticao(COMPETICAO.id),
  )
}

describe('CompeticaoDetailPage', () => {
  it('abre no bimestre aberto e mostra os grupos dele', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByRole('heading', { name: 'Copa do Conhecimento' })).toBeInTheDocument()

    // O b1 é o único aberto: a página abre nele, e não no primeiro por acaso.
    expect(screen.getByLabelText('Bimestre')).toHaveValue('b1')
    expect(screen.getByText('Integrantes no 1º Bimestre')).toBeInTheDocument()
    expect(screen.queryAllByText('Beta')).toHaveLength(0)
    expect((await screen.findAllByText('Alpha')).length).toBeGreaterThan(0)
  })

  it('mostra a situação de cada bimestre em etiqueta', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    expect(screen.getByText('Aberto')).toBeInTheDocument()
    expect(screen.getAllByText('Encerrado')).toHaveLength(3)
  })

  it('troca a lista de grupos ao trocar o bimestre e trava o encerrado', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')

    await pessoa.selectOptions(screen.getByLabelText('Bimestre'), 'b2')

    expect((await screen.findAllByText('Beta')).length).toBeGreaterThan(0)
    expect(screen.queryAllByText('Alpha')).toHaveLength(0)

    // O b2 está encerrado: a composição fica só de leitura.
    expect(screen.getByLabelText('Grupo de Ana')).toBeDisabled()
    expect(
      screen.getByText(/Este bimestre está encerrado\. A composição dos grupos fica só de/),
    ).toBeInTheDocument()
  })

  it('avisa quando a competição não existe e oferece a volta', async () => {
    server.use(
      http.get(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ statusCode: 404, message: 'Competição não encontrada.' }, { status: 404 }),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    expect(await screen.findByText('Competição não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /voltar para as salas/i })).toBeInTheDocument()
  })

  it('navega entre as abas e mantém a de grupos como ponto de partida', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario(), ...componentesDoBimestre())
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')

    // A tela abre nos grupos, que é de onde a Etapa 04 parou.
    expect(screen.getByRole('tab', { name: 'Grupos' })).toHaveAttribute('aria-selected', 'true')

    await pessoa.click(screen.getByRole('tab', { name: 'Componentes' }))

    expect(screen.getByRole('tab', { name: 'Componentes' })).toHaveAttribute('aria-selected', 'true')
    // A aba de grupos sai da tela junto: nada de manter os componentes atrás de
    // um painel que não está mais visível.
    expect(screen.queryByText('Novo grupo')).not.toBeInTheDocument()
    expect(await screen.findByText('Prova bimestral')).toBeInTheDocument()

    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))

    expect(screen.queryByText('Prova bimestral')).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Componente de pontuação')).toBeInTheDocument()
  })

  it('abre a aba de rankings com o ranking parcial do bimestre encerrado', async () => {
    const pessoa = userEvent.setup()
    server.use(
      ...cenario(),
      rankingsDaCompeticao({
        parcial: rankingDeGrupo({
          competicaoId: COMPETICAO.id,
          tipo: TIPO_RANKING.PARCIAL,
          bimestreId: 'b4',
          itens: [linhaDeGrupo({ grupoId: 'g1', nome: 'Alpha', posicao: 1, valor: 9 })],
        }),
      }),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    // A aba era um aviso desabilitado até a Etapa 07; agora é navegação de verdade.
    await pessoa.click(screen.getByRole('tab', { name: 'Rankings' }))

    expect(screen.getByRole('tab', { name: 'Rankings' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: 'Ranking parcial' })).toBeInTheDocument()
  })

  it('abre a prévia da síntese na aba própria, com as notas já lançadas', async () => {
    const pessoa = userEvent.setup()
    // A escola do cenário é conceitual — o modelo vem da API —, então o "B" da Ana
    // vale 8 na conta. Como o componente pesa 100%, a síntese da matéria é a
    // própria nota.
    server.use(
      ...cenario(),
      ...componentesDoBimestre([lancamento('mat-1-cp1', ALUNOS[0]!, 'B')]),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    await pessoa.click(screen.getByRole('tab', { name: 'Prévia' }))

    expect(screen.getByRole('tab', { name: 'Prévia' })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('columnheader', { name: 'Matemática' })).toBeInTheDocument()
    // Com uma matéria só no bimestre, a síntese dela e a bimestral são o mesmo
    // número: a coluna da matéria e a da média mostram os dois 8,00.
    expect(within(await screen.findByRole('row', { name: /^Ana/ })).getAllByText('8.00')).toHaveLength(2)
  })

  it('abre a central de relatórios com os quatro links de grupo e de aluno', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario())
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    await pessoa.click(screen.getByRole('tab', { name: 'Relatórios' }))

    // A aba é só um índice: nenhuma das quatro telas de relatório é montada aqui, e
    // por isso ela não busca nada. O `onUnhandledRequest: 'error'` do msw cobra
    // essa ausência de requisição a cada clique.
    const porGrupo = await screen.findByRole('region', { name: 'Por grupo' })
    const linhaDoGrupo = within(porGrupo).getByRole('row', { name: /Alpha/ })
    expect(within(linhaDoGrupo).getByRole('link', { name: 'Do grupo' })).toHaveAttribute(
      'href',
      '/grupos/g1/relatorio',
    )
    expect(
      within(linhaDoGrupo).getByRole('link', { name: 'Comparado aos grupos' }),
    ).toHaveAttribute('href', '/grupos/g1/relatorio-comparativo')

    // A competição vai na query dos relatórios de aluno: a API só a exige quando o
    // aluno está em mais de uma competição, e o professor está numa só agora.
    const porAluno = within(screen.getByRole('region', { name: 'Por aluno' }))
    const linhaDaAna = within(porAluno.getByRole('row', { name: /Ana/ }))
    expect(linhaDaAna.getByRole('link', { name: 'Individual' })).toHaveAttribute(
      'href',
      '/alunos/a1/relatorio-individual?competicaoId=comp-1',
    )
    expect(linhaDaAna.getByRole('link', { name: 'Comparado ao grupo' })).toHaveAttribute(
      'href',
      '/alunos/a1/relatorio-comparativo-grupo?competicaoId=comp-1',
    )
  })

  it('descarta o componente escolhido ao trocar de bimestre', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario(), ...componentesDoBimestre())
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Alpha')

    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))
    await pessoa.selectOptions(await screen.findByLabelText('Componente de pontuação'), 'mat-1-cp1')

    // A escola do cenário é conceitual, e é o modelo que a API manda que decide o
    // campo: o seletor de conceitos, e não um palpite da tela.
    expect((await screen.findAllByLabelText('Conceito de Ana')).length).toBeGreaterThan(0)

    // Leva para o b2, que está encerrado e não tem componente: a escolha do b1
    // não pode sobrar, senão a tela mostraria as notas de uma prova do outro bimestre.
    await pessoa.selectOptions(screen.getByLabelText('Bimestre'), 'b2')

    await waitFor(() => expect(screen.getByLabelText('Componente de pontuação')).toHaveValue(''))
    expect(screen.queryAllByLabelText('Conceito de Ana')).toHaveLength(0)
  })

  it('troca o campo de nota com o modelo da escola quando o contexto muda de sala', async () => {
    const pessoa = userEvent.setup()
    const SALA_NUMERICA = sala({ id: 'sala-2', nome: '1º DS', escola: ESCOLA_B })
    const LECIONAMENTO_NUMERICO = lecionamento({ id: 'lec-2', salaId: SALA_NUMERICA.id })
    const COMPETICAO_NUMERICA = competicao({
      id: 'comp-2',
      nome: 'Copa da Escola Numérica',
      lecionamentoId: LECIONAMENTO_NUMERICO.id,
    })
    const BIMESTRE_NUMERICO = bimestre({
      id: 'n1',
      competicaoId: COMPETICAO_NUMERICA.id,
      numero: 1,
      situacao: SITUACAO_BIMESTRE.ABERTO,
    })

    /*
     * Duas escolas de escalas diferentes no mesmo professor é o cenário do bug: a
     * escola do `COMPETICAO` é conceitual e a da outra competição é numérica. A
     * troca de contexto precisa trocar o campo junto, senão o professor lança
     * conceito na escola que só aceita número e a API recusa o lote depois.
     */
    server.use(
      http.get(`${API}/competicoes/:id`, ({ params }) =>
        HttpResponse.json(
          String(params.id) === COMPETICAO_NUMERICA.id
            ? { ...COMPETICAO_NUMERICA, bimestres: [BIMESTRE_NUMERICO] }
            : { ...COMPETICAO, bimestres: BIMESTRES },
        ),
      ),
      ...salasDoProfessor(
        [SALA, SALA_NUMERICA],
        { [SALA.id]: [LECIONAMENTO], [SALA_NUMERICA.id]: [LECIONAMENTO_NUMERICO] },
      ),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
      grupos(),
      ...desempateDaCompeticao([]),
      ...componentesDoBimestre(),
    )
    abrirSessao()

    renderComSessao(
      <>
        <Link to={rotaDaCompeticao(COMPETICAO_NUMERICA.id)}>Ir para a escola numérica</Link>
        <Routes>
          <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
        </Routes>
      </>,
      rotaDaCompeticao(COMPETICAO.id),
    )

    await screen.findByRole('heading', { name: 'Copa do Conhecimento' })
    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))
    await pessoa.selectOptions(await screen.findByLabelText('Componente de pontuação'), 'mat-1-cp1')

    // A primeira escola é conceitual: o campo é o seletor de rótulos do CPS ETEC,
    // que é o que a API da escola manda.
    expect((await screen.findAllByLabelText('Conceito de Ana')).length).toBeGreaterThan(0)

    await pessoa.click(screen.getByRole('link', { name: 'Ir para a escola numérica' }))

    // Mesma tela e mesma sessão, outra escola: o campo vira o número de 1 a 10 sem
    // recarregar a página, porque o modelo é lido da sala que está em exibição.
    await waitFor(() =>
      expect(screen.getAllByLabelText('Nota de Ana')[0]).toHaveAttribute('type', 'number'),
    )
    expect(screen.queryAllByLabelText('Conceito de Ana')).toHaveLength(0)
  })

  it('edita o nome da competição e reflete no cabeçalho', async () => {
    const pessoa = userEvent.setup()
    let nome = COMPETICAO.nome

    server.use(
      http.get(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ ...COMPETICAO, nome, bimestres: BIMESTRES }),
      ),
      ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
      grupos(),
      ...desempateDaCompeticao([]),
      http.patch(`${API}/competicoes/:id`, async ({ request }) => {
        const corpo = (await request.json()) as { nome: string }
        nome = corpo.nome
        return HttpResponse.json({ ...COMPETICAO, nome })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /editar nome/i }))

    const dialogo = await screen.findByRole('dialog')
    const campo = within(dialogo).getByLabelText(/nome da competição/i)
    expect(campo).toHaveValue('Copa do Conhecimento')

    await pessoa.clear(campo)
    await pessoa.type(campo, 'Copa do Saber')
    await pessoa.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }))

    // O cabeçalho relê a competição: o nome novo vem do servidor, não do palpite
    // de manter o valor digitado na tela.
    expect(await screen.findByRole('heading', { name: 'Copa do Saber' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('edita as datas de um bimestre aberto e reflete no card', async () => {
    const pessoa = userEvent.setup()
    const bimestresMutaveis = BIMESTRES_ENCADEADOS.map((item) => ({ ...item }))

    server.use(
      http.get(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ ...COMPETICAO, bimestres: bimestresMutaveis }),
      ),
      ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
      grupos(),
      ...desempateDaCompeticao([]),
      http.patch(`${API}/bimestres/:id`, async ({ request }) => {
        const corpo = (await request.json()) as { dataInicio: string; dataFim: string }
        const indice = bimestresMutaveis.findIndex((item) => item.id === 'comp-1-b1')
        bimestresMutaveis[indice] = { ...bimestresMutaveis[indice]!, ...corpo }
        return HttpResponse.json(bimestresMutaveis[indice])
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')

    // Só o bimestre aberto tem o lápis; o encerrado não oferece a edição.
    expect(screen.getByRole('button', { name: /editar datas do 1º bimestre/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /editar datas do 2º bimestre/i }),
    ).not.toBeInTheDocument()

    await pessoa.click(screen.getByRole('button', { name: /editar datas do 1º bimestre/i }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByLabelText('Início')).toHaveValue('2026-02-01')
    expect(within(dialogo).getByLabelText('Fim')).toHaveValue('2026-04-30')

    fireEvent.change(within(dialogo).getByLabelText('Início'), { target: { value: '2026-02-05' } })
    await pessoa.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }))

    expect(await screen.findByText(/05\/02\/2026 a 30\/04\/2026/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mostra a mensagem da API e não altera o card quando a edição das datas é recusada', async () => {
    const pessoa = userEvent.setup()
    const mensagem =
      'Não é possível alterar as datas de um bimestre que já possui pontuação definida.'

    server.use(
      http.get(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ ...COMPETICAO, bimestres: BIMESTRES_ENCADEADOS }),
      ),
      ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
      http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
      grupos(),
      ...desempateDaCompeticao([]),
      http.patch(`${API}/bimestres/:id`, () =>
        HttpResponse.json({ statusCode: 409, message: mensagem }, { status: 409 }),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /editar datas do 1º bimestre/i }))

    const dialogo = await screen.findByRole('dialog')
    fireEvent.change(within(dialogo).getByLabelText('Início'), { target: { value: '2026-02-05' } })
    await pessoa.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }))

    // O motivo vem do servidor e o modal continua aberto: nada foi gravado.
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(mensagem)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/01\/02\/2026 a 30\/04\/2026/)).toBeInTheDocument()
  })

  it('mostra a mensagem da API e mantém a competição quando a exclusão é recusada', async () => {
    const pessoa = userEvent.setup()
    const mensagem = 'Competição já possui pontuação definida e não pode ser excluída.'

    server.use(
      ...cenario(),
      http.delete(`${API}/competicoes/:id`, () =>
        HttpResponse.json({ statusCode: 409, message: mensagem }, { status: 409 }),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /excluir competição/i }))

    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir competição/i }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(mensagem)
    // Continua na competição: a recusa não desmonta nada.
    expect(screen.getByRole('heading', { name: 'Copa do Conhecimento' })).toBeInTheDocument()
  })

  it('exclui a competição sem uso e volta para a listagem da sala', async () => {
    const pessoa = userEvent.setup()

    server.use(
      ...cenario(),
      http.delete(`${API}/competicoes/:id`, () => new HttpResponse(null, { status: 204 })),
    )
    abrirSessao()

    renderComSessao(
      <Routes>
        <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
        <Route path={rotaDasCompeticoes(SALA.id)} element={<p>Listagem de competições da sala</p>} />
      </Routes>,
      rotaDaCompeticao(COMPETICAO.id),
    )

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /excluir competição/i }))

    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir competição/i }))

    expect(await screen.findByText('Listagem de competições da sala')).toBeInTheDocument()
  })

  it('edita o nome de um grupo e reflete na listagem', async () => {
    const pessoa = userEvent.setup()
    let listagem = [grupoVazio('g1', 'Alpha')]

    server.use(
      ...cenarioComGrupos(() => listagem),
      http.patch(`${API}/grupos/:id`, async ({ request, params }) => {
        const corpo = (await request.json()) as { nome: string }
        listagem = listagem.map((item) =>
          item.id === String(params.id) ? { ...item, nome: corpo.nome } : item,
        )
        return HttpResponse.json(listagem.find((item) => item.id === String(params.id)))
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /editar grupo alpha/i }))

    const dialogo = await screen.findByRole('dialog')
    const campo = within(dialogo).getByLabelText(/nome do grupo/i)
    expect(campo).toHaveValue('Alpha')

    await pessoa.clear(campo)
    await pessoa.type(campo, 'Alpha Prime')
    await pessoa.click(within(dialogo).getByRole('button', { name: /salvar alterações/i }))

    expect((await screen.findAllByText('Alpha Prime')).length).toBeGreaterThan(0)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('exclui um grupo sem integrantes e ele some da listagem', async () => {
    const pessoa = userEvent.setup()
    let listagem = [grupoVazio('g1', 'Alpha'), grupoVazio('g2', 'Beta')]

    server.use(
      ...cenarioComGrupos(() => listagem),
      http.delete(`${API}/grupos/:id`, ({ params }) => {
        listagem = listagem.filter((item) => item.id !== String(params.id))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /excluir grupo alpha/i }))

    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir grupo/i }))

    await waitFor(() => expect(screen.queryAllByText('Alpha')).toHaveLength(0))
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0)
  })

  it('mostra a mensagem da API e mantém o grupo quando a exclusão é recusada', async () => {
    const pessoa = userEvent.setup()
    const mensagem =
      'Grupo possui membros em algum bimestre. Remova os membros um a um antes de excluir.'
    const listagem = [grupoVazio('g1', 'Alpha')]

    server.use(
      ...cenarioComGrupos(() => listagem),
      http.delete(`${API}/grupos/:id`, () =>
        HttpResponse.json({ statusCode: 409, message: mensagem }, { status: 409 }),
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    await screen.findAllByText('Alpha')
    await pessoa.click(screen.getByRole('button', { name: /excluir grupo alpha/i }))

    const dialogo = await screen.findByRole('dialog')
    await pessoa.click(within(dialogo).getByRole('button', { name: /excluir grupo/i }))

    // A orientação vem do servidor e o modal continua aberto: o grupo fica.
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(mensagem)
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
  })
})

/** Os dois endpoints de componentes que as abas novas consomem. */
function componentesDoBimestre(notas: Lancamento[] = []) {
  return [
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(
        componentesDoBimestreResposta(String(params.id), [MATEMATICA_FECHADA]),
      ),
    ),
    http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
      HttpResponse.json(validacaoDePesos([MATEMATICA_FECHADA])),
    ),
    ...listagemDeLancamentos(notas),
  ]
}
