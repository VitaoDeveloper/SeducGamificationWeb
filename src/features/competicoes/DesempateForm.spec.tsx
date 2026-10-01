import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { RequestHandler } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import {
  API,
  ESCOLA_A,
  PROFESSOR_DE_TESTE,
  TOKEN_DE_TESTE,
  aluno,
  bimestre,
  competicao,
  desempateDaCompeticao,
  lecionamento,
  linhaDeGrupo,
  pendenciaDeDesempate,
  rankingDeGrupo,
  rankingIndividual,
  rankingIndividualDaCompeticao,
  sala,
  salasDoProfessor,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import { CompeticaoDetailPage } from './CompeticaoDetailPage'
import { ORIGEM_DESEMPATE } from './desempate.tipos'
import { ROTA_COMPETICAO_DETALHE, rotaDaCompeticao } from './rotas'
import type { Bimestre } from './competicoes.tipos'
import type { CorpoDoDesempate, PendenciaDeDesempate } from './desempate.tipos'

/*
 * A Etapa 09 dá duas respostas ao mesmo impasse, e os testes são organizados
 * alrededor do que elas têm em comum: quem resolve não é a tela.
 *
 * Toda verificação importante aqui é sobre o que chega no corpo do `POST` ou o
 * que a API devolve — as posições gravadas, o `bimestreId` do escopo, a lista de
 * pendências depois do envio. Um teste que conferisse apenas "o modal fechou" ou
 * "apareceu um toast" passaria com uma tela que grava a ordem errada, que é
 * exatamente a falha que a API tem como péssimo: ela grava o que for pedido, sem
 * conferir se o professor pediu a ordem que montou.
 *
 * Por isso os testes renderizam a página inteira, e não o formulário isolado: o
 * ranking é o que diz em que posição o bloco está, e a faixa de avisos é o que
 * some quando o desempate é gravado.
 *
 * E o handler do teste vem **antes** do cenário em todo `server.use`: o msw
 * resolve pela primeira rota que casa, então quem responde é o primeiro — e um
 * handler de teste colocado depois do cenário seria um teste que nunca exercita
 * o caminho que acha que exercita.
 */

const SALA = sala({ id: 'sala-1', nome: '2º DS', escola: ESCOLA_A })
const LECIONAMENTO = lecionamento({ id: 'lec-1', salaId: SALA.id })
const COMPETICAO = competicao({
  id: 'comp-1',
  nome: 'Copa do Conhecimento',
  lecionamentoId: LECIONAMENTO.id,
})

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })

/**
 * Bimestres com o 1º encerrado — é de um bimestre encerrado que nasce pendência
 * de desempate — e o 2º aberto, que é onde a página abre por padrão.
 */
const BIMESTRES: Bimestre[] = [1, 2, 3, 4].map((numero) =>
  bimestre({
    id: `b${numero}`,
    competicaoId: COMPETICAO.id,
    numero,
    situacao: numero === 2 ? SITUACAO_BIMESTRE.ABERTO : SITUACAO_BIMESTRE.ENCERRADO,
  }),
)

/** As duas equipes empatadas em 8.20, que é o empate do cenário. */
const PENDENCIA_PARCIAL: PendenciaDeDesempate = pendenciaDeDesempate({
  bimestreId: 'b1',
  valor: 8.2,
  grupos: [
    { grupoId: 'g1', nome: 'Equipe Alfa', valor: 8.2 },
    { grupoId: 'g2', nome: 'Equipe Beta', valor: 8.2 },
  ],
})

/**
 * Ranking parcial do 1º bimestre, com o empate das duas equipes do cenário em 3º
 * lugar.
 *
 * A Alfa e a Beta empatam em 8.20 e ocupam a terceira e a quarta posições — o que
 * faz deste o cenário que pega o erro de quem oferece "1º e 2º" para o bloco.
 */
const PARCIAL = rankingDeGrupo({
  competicaoId: COMPETICAO.id,
  tipo: 'parcial',
  bimestreId: 'b1',
  itens: [
    linhaDeGrupo({ grupoId: 'g3', nome: 'Equipe Gama', posicao: 1, valor: 9.5 }),
    linhaDeGrupo({ grupoId: 'g4', nome: 'Equipe Delta', posicao: 2, valor: 9.1 }),
    linhaDeGrupo({ grupoId: 'g1', nome: 'Equipe Alfa', posicao: 3, valor: 8.2, empate: true }),
    linhaDeGrupo({ grupoId: 'g2', nome: 'Equipe Beta', posicao: 3, valor: 8.2, empate: true }),
  ],
})

/** Ranking anual, com as mesmas duas equipes empatadas no topo. */
const ANUAL = rankingDeGrupo({
  competicaoId: COMPETICAO.id,
  itens: [
    linhaDeGrupo({ grupoId: 'g1', nome: 'Equipe Alfa', posicao: 1, valor: 33.1, empate: true }),
    linhaDeGrupo({ grupoId: 'g2', nome: 'Equipe Beta', posicao: 1, valor: 33.1, empate: true }),
  ],
})
const INDIVIDUAL = rankingIndividual({ competicaoId: COMPETICAO.id, itens: [] })

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: { id: PROFESSOR_DE_TESTE, tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
  })
}

/**
 * Cenário da página com uma pendência, e a contagem das buscas de ranking.
 *
 * A contagem é parte do cenário porque a revalidação é uma das promessas da etapa:
 * o desempate gravado não muda nada na tela até o ranking ser buscado de novo.
 */
/**
 * Cenário da página com uma pendência, e a contagem das buscas de ranking.
 *
 * `primeiro` entra **antes** dos handlers do cenário, porque o msw resolve pela
 * primeira rota que casa: um `http.post` de teste colocado depois de
 * `desempateDaCompeticao` seria um handler que nunca responde, e o teste
 * "provaria" o caminho do cenário achando que provou o seu.
 *
 * A contagem é parte do cenário porque a revalidação é uma das promessas da etapa:
 * o desempate gravado não muda nada na tela até o ranking ser buscado de novo.
 */
function cenario(
  pendencias: PendenciaDeDesempate[],
  primeiro: RequestHandler[] = [],
  buscas: { ranking: number } = { ranking: 0 },
) {
  return [
    ...primeiro,
    http.get(`${API}/competicoes/:id`, () =>
      HttpResponse.json({ ...COMPETICAO, bimestres: BIMESTRES }),
    ),
    ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json([ANA])),
    http.get(`${API}/competicoes/:id/grupos`, () =>
      HttpResponse.json({ bimestreId: 'b2', grupos: [] }),
    ),
    http.get(`${API}/competicoes/:id/ranking`, ({ request }) => {
      const bimestreId = new URL(request.url).searchParams.get('bimestreId')

      buscas.ranking += 1

      return HttpResponse.json(bimestreId ? PARCIAL : ANUAL)
    }),
    rankingIndividualDaCompeticao(INDIVIDUAL),
    ...desempateDaCompeticao(pendencias),
  ]
}

function renderizarDetalhe() {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_COMPETICAO_DETALHE} element={<CompeticaoDetailPage />} />
    </Routes>,
    rotaDaCompeticao(COMPETICAO.id),
  )
}

/** A faixa de avisos, que é o que o `role="alert"` delimita. */
async function abrirAviso() {
  return within(await screen.findByRole('alert'))
}

/** Abre o diálogo pelo botão do aviso e devolve o modal. */
async function abrirDesempate(pessoa: ReturnType<typeof userEvent.setup>) {
  const aviso = await abrirAviso()
  await pessoa.click(aviso.getByRole('button', { name: 'Resolver desempate' }))

  return screen.findByRole('dialog')
}

describe('desempate', () => {
  it('oferece as posições que o bloco já ocupa, e não posições a partir do 1º', async () => {
    const pessoa = userEvent.setup()
    server.use(...cenario([PENDENCIA_PARCIAL]))
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    /*
     * A Alfa e a Beta estão em 3º e 4º. Se a tela oferecesse 1º e 2º, gravaria
     * posições que jogam a tabela para o topo — e a API obedeceria, porque ela
     * grava a posição que recebe.
     */
    const posicaoDaAlfa = await within(modal).findByLabelText<HTMLSelectElement>('Posição de Equipe Alfa')
    expect([...posicaoDaAlfa.options].map((opcao) => opcao.textContent)).toEqual(['3º', '4º'])
    expect(posicaoDaAlfa).toHaveValue('3')

    const posicaoDaBeta = within(modal).getByLabelText<HTMLSelectElement>('Posição de Equipe Beta')
    expect(posicaoDaBeta).toHaveValue('4')
  })

  it('grava a ordem que o professor montou, e some com a pendência', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]
    const enviados: CorpoDoDesempate[] = []

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate`, async ({ request }) => {
          const corpo = (await request.json()) as CorpoDoDesempate
          enviados.push(corpo)

          pendencias.length = 0

          return HttpResponse.json({
            bimestreId: corpo.bimestreId,
            desempates: corpo.ordem.map((ordem) => ({ ...ordem, origem: ORIGEM_DESEMPATE.MANUAL })),
          })
        }),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    // A API entrega as equipes por nome; o professor troca a ordem, e o corpo sai
    // na ordem do ranking.
    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Alfa'), '4')
    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Beta'), '3')
    await pessoa.click(within(modal).getByRole('button', { name: 'Salvar esta ordem' }))

    await waitFor(() => expect(enviados).toHaveLength(1))
    expect(enviados[0]).toEqual({
      bimestreId: 'b1',
      ordem: [
        { grupoId: 'g2', posicao: 3 },
        { grupoId: 'g1', posicao: 4 },
      ],
    })

    // A confirmação do que foi gravado, e o diálogo fechado.
    expect(await screen.findByText(/Desempate do 1º Bimestre gravado/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // E o aviso some: a pendência deixa de existir para a próxima listagem.
    await waitFor(() => expect(screen.queryByText(/empataram/)).not.toBeInTheDocument())
  })

  it('não deixa salvar duas equipes na mesma posição', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]
    let gravados = 0

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate`, () => {
          gravados += 1
          return HttpResponse.json({ bimestreId: 'b1', desempates: [] })
        }),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    // Jogo as duas na mesma posição, que é o que a API recusa com 400.
    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Alfa'), '4')
    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Beta'), '4')

    expect(
      await within(modal).findByText(/Cada posição só pode valer para uma equipe\./),
    ).toBeInTheDocument()
    expect(within(modal).getByRole('button', { name: 'Salvar esta ordem' })).toBeDisabled()
    expect(gravados).toBe(0)
  })

  it('mantém o desempate de quem ele é: o do ranking anual vai sem bimestre', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [
      pendenciaDeDesempate({
        bimestreId: null,
        valor: 33.1,
        grupos: [
          { grupoId: 'g1', nome: 'Equipe Alfa', valor: 33.1 },
          { grupoId: 'g2', nome: 'Equipe Beta', valor: 33.1 },
        ],
      }),
    ]
    const enviados: CorpoDoDesempate[] = []

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate`, async ({ request }) => {
          const corpo = (await request.json()) as CorpoDoDesempate
          enviados.push(corpo)

          return HttpResponse.json({ bimestreId: null, desempates: [] })
        }),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const aviso = await abrirAviso()

    // O escopo se anuncia pelo nome, porque "ranking anual" é o que o professor
    // conhece — e é o que diz que o desempate é de ano, e não do bimestre aberto.
    expect(aviso.getByText('ranking anual')).toBeInTheDocument()

    await pessoa.click(aviso.getByRole('button', { name: 'Resolver desempate' }))
    const modal = await screen.findByRole('dialog')
    expect(within(modal).getByRole('heading', { name: 'Desempatar o ranking anual' })).toBeInTheDocument()

    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Alfa'), '2')
    await pessoa.selectOptions(within(modal).getByLabelText('Posição de Equipe Beta'), '1')
    await pessoa.click(within(modal).getByRole('button', { name: 'Salvar esta ordem' }))

    await waitFor(() => expect(enviados).toHaveLength(1))
    // `bimestreId: null` no corpo é o que distingue o desempate anual do parcial
    // na API — enviar `undefined` serializaria a chave fora e a tela trataria o
    // anual como se fosse de um bimestre.
    expect(enviados[0]!.bimestreId).toBeNull()
    expect(await screen.findByText(/Desempate do ranking anual gravado/)).toBeInTheDocument()
  })

  it('busca o ranking de novo depois que o desempate é gravado', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]
    const buscas = { ranking: 0 }

    server.use(
      ...cenario(
        pendencias,
        [
          http.post(`${API}/competicoes/:id/desempate`, () => {
            pendencias.length = 0
            return HttpResponse.json({ bimestreId: 'b1', desempates: [] })
          }),
        ],
        buscas,
      ),
    )
    abrirSessao()

    renderizarDetalhe()

    // Com a aba de rankings aberta, quem mostra a posição gravada é ela.
    await pessoa.click(await screen.findByRole('tab', { name: 'Rankings' }))
    await waitFor(() => expect(buscas.ranking).toBeGreaterThan(0))

    const modal = await abrirDesempate(pessoa)
    await screen.findByLabelText('Posição de Equipe Alfa')

    // A contagem é tirada aqui, com o formulário já aberto: o fetch dele já
    // aconteceu, e o que falta para o professor é o do ranking da aba.
    const antes = buscas.ranking

    await pessoa.click(within(modal).getByRole('button', { name: 'Salvar esta ordem' }))

    /*
     * Sem a revalidação, a aba continuaria mostrando Alfa e Beta empatadas em 3º
     * e 4º depois de o professor ter gravado a ordem — o nome da posição trocada,
     * com a resposta da API de antes.
     */
    await waitFor(() => expect(buscas.ranking).toBeGreaterThan(antes))
  })

  it('não grava nada enquanto o professor só lê o critério automático', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]
    let automaticos = 0

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate/aplicar-automatico`, () => {
          automaticos += 1
          return HttpResponse.json({ bimestreId: 'b1', aplicados: 0, desempates: [], residuais: [] })
        }),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    // O caminho automático está na tela, com a regra escrita: o professor precisa
    // saber o que está cedendo ao escolher não decidir.
    expect(within(modal).getByText('Ou deixar a API decidir')).toBeInTheDocument()
    expect(within(modal).getByText(/maior média dos integrantes naquele componente/)).toBeInTheDocument()

    // Abrir a confirmação ainda não grava.
    await pessoa.click(
      within(modal).getByRole('button', { name: 'Aplicar critério automático agora' }),
    )
    expect(
      await within(modal).findByRole('button', { name: 'Sim, aplicar o critério automático' }),
    ).toBeInTheDocument()
    expect(automaticos).toBe(0)

    // Só a confirmação chama a API, e leva o escopo do empate.
    await pessoa.click(within(modal).getByRole('button', { name: 'Sim, aplicar o critério automático' }))
    await waitFor(() => expect(automaticos).toBe(1))
    expect(await within(modal).findByText(/Nada a fazer neste escopo\./)).toBeInTheDocument()
  })

  it('mostra o que o critério automático gravou, e o que ele não conseguiu decidir', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate/aplicar-automatico`, () =>
          /*
           * Metade resolvida, metade empatada de verdade: é a resposta que a API dá
           * quando a regra decide um empate e se esbarra em outro, e a que a tela
           * precisa mostrar sem dizer que "foi resolvido" por inteiro.
           */
          HttpResponse.json({
            bimestreId: 'b1',
            aplicados: 1,
            desempates: [
              { grupoId: 'g1', posicao: 3, origem: ORIGEM_DESEMPATE.AUTOMATICO },
              { grupoId: 'g2', posicao: 4, origem: ORIGEM_DESEMPATE.AUTOMATICO },
            ],
            residuais: [
              {
                tipo: 'parcial',
                bimestreId: 'b1',
                valor: 8.2,
                posicao: 3,
                grupos: [
                  { grupoId: 'g3', nome: 'Equipe Gama', valor: 8.2 },
                  { grupoId: 'g4', nome: 'Equipe Delta', valor: 8.2 },
                ],
              },
            ],
          }),
        ),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    await pessoa.click(
      within(modal).getByRole('button', { name: 'Aplicar critério automático agora' }),
    )
    await pessoa.click(
      within(modal).getByRole('button', { name: 'Sim, aplicar o critério automático' }),
    )

    /*
     * Os nomes vêm do empate resolvido, e não do id que a API devolve no registro:
     * uma confirmação de desempate em ids não é uma confirmação que o professor
     * consiga ler.
     */
    const gravados = await within(modal).findAllByRole('listitem')
    expect(gravados[0]).toHaveTextContent('3º — Equipe Alfa')
    expect(gravados[1]).toHaveTextContent('4º — Equipe Beta')

    // E o que sobrou aparece como o que é: pendência do professor, não erro.
    expect(
      within(modal).getByText(/As equipes terminaram empatadas em todas as matérias/),
    ).toBeInTheDocument()
    expect(within(modal).getByText(/Equipe Gama e Equipe Delta/)).toBeInTheDocument()
  })

  it('mostra a recusa da API e mantém o desempate na tela', async () => {
    const pessoa = userEvent.setup()
    const pendencias = [PENDENCIA_PARCIAL]

    server.use(
      ...cenario(pendencias, [
        http.post(`${API}/competicoes/:id/desempate`, () =>
          HttpResponse.json(
            {
              statusCode: 400,
              error: 'Bad Request',
              message: 'Os grupos informados não formam exatamente um empate desse ranking.',
            },
            { status: 400 },
          ),
        ),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    const modal = await abrirDesempate(pessoa)

    await pessoa.click(within(modal).getByRole('button', { name: 'Salvar esta ordem' }))

    // A falha fica dentro do diálogo, com a ordem ainda montada: o professor
    // corrigiu um estado que a tela monta, e um erro que fecha a tela o obriga a
    // refazer tudo.
    expect(
      await within(modal).findByText(
        /Os grupos informados não formam exatamente um empate desse ranking\./,
      ),
    ).toBeInTheDocument()
    expect(within(modal).getByLabelText('Posição de Equipe Alfa')).toHaveValue('3')

    /*
     * A pendência continua no aviso: uma recusa da API não resolveu nada. O botão
     * do aviso é a prova, e ele é procurado na tela toda porque a falha do diálogo
     * também é um `alert` — e são dois avisos diferentes, não o mesmo.
     */
    expect(screen.getByRole('button', { name: 'Resolver desempate' })).toBeEnabled()
  })
})

describe('pendências de desempate na página da competição', () => {
  it('some com a faixa quando não há empate pendente', async () => {
    server.use(...cenario([]))
    abrirSessao()

    renderizarDetalhe()
    await screen.findByRole('heading', { name: 'Copa do Conhecimento' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('conta as equipes e as rodadas, quando o empate não é o único', async () => {
    server.use(
      ...cenario([
        PENDENCIA_PARCIAL,
        pendenciaDeDesempate({
          bimestreId: null,
          valor: 33.1,
          grupos: [
            { grupoId: 'g5', nome: 'Equipe Gama', valor: 33.1 },
            { grupoId: 'g6', nome: 'Equipe Delta', valor: 33.1 },
          ],
        }),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()

    /*
     * Com mais de um empate, a abertura não nomeia um escopo — escolher um entre os
     * demais seria arbitrário. O que ela diz é o tamanho do problema, e a lista
     * abaixo nomeia cada escopo.
     */
    expect(
      await screen.findByText('4 equipes continuam empatadas em 2 rodadas de ranking.'),
    ).toBeInTheDocument()
    const aviso = within(screen.getByRole('alert'))
    expect(aviso.getByText('1º Bimestre')).toBeInTheDocument()
    expect(aviso.getByText('ranking anual')).toBeInTheDocument()
    // Um botão por pendência, porque resolver um não resolve o outro.
    expect(aviso.getAllByRole('button', { name: 'Resolver desempate' })).toHaveLength(2)
  })

  it('avisa quando a listagem de pendências falha, em vez de dizer que não há empate', async () => {
    server.use(
      ...cenario([], [
        /*
         * Falha sem mensagem no corpo — rede caiu, proxy respondeu html, API
         * devolvendo algo que não é o NestJS. É o caso em que a tela tem de
         * falar por ela mesma, e o silêncio seria o pior desfecho: esconderia um
         * empate que existe, e o professor concluiria que não há nada a resolver.
         */
        http.get(`${API}/competicoes/:id/desempate/pendencias`, () =>
          HttpResponse.json({}, { status: 503 }),
        ),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()

    const aviso = within(await screen.findByRole('alert'))
    expect(aviso.getByText(/Não foi possível conferir os empates/)).toBeInTheDocument()
    expect(aviso.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled()
  })

  it('traduz a falta de acesso do desempate, que a API responde com 403', async () => {
    server.use(
      ...cenario([], [
        http.get(`${API}/competicoes/:id/desempate/pendencias`, () =>
          HttpResponse.json({ statusCode: 403, message: 'Forbidden' }, { status: 403 }),
        ),
      ]),
    )
    abrirSessao()

    renderizarDetalhe()

    const aviso = within(await screen.findByRole('alert'))
    expect(aviso.getByText(/Só o professor responsável por ela pode resolver os empates/)).toBeInTheDocument()
  })
})