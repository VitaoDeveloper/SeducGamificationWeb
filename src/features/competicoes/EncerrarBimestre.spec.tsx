import { AxiosError } from 'axios'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
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
  componentesDoBimestre as respostaDeComponentes,
  empate,
  encerramento,
  encerramentoAceito,
  encerramentoRecusadoPorPesos,
  grupo,
  lecionamento,
  listagemDeLancamentos,
  materia,
  materiaFechada,
  membro,
  sala,
  salasDoProfessor,
  sinteseDoAluno,
  sinteseDoGrupo,
  validacaoDePesos,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import { CompeticaoDetailPage } from './CompeticaoDetailPage'
import { recusaDoEncerramento } from './encerramento.api'
import { ROTA_COMPETICAO_DETALHE, rotaDaCompeticao } from './rotas'
import type { Bimestre } from './competicoes.tipos'

/*
 * A Etapa 07 é a única da série em que a tela escreve algo que não dá para
 * desfazer, e por isso os quatro casos da doc são os quatro jeitos de a confirmação
 * falhar: chamar a API sem o professor confirmar, chamar e ser recusado por pesos,
 * chamar e ser aceito com empate, e o mesmo aceite fechando a competição.
 *
 * Os testes renderizam a página inteira em vez do botão isolado, porque é na
 * página que mora o que o encerramento dispara: a etiqueta do bimestre, o
 * bloqueio das abas de montagem, a troca da prévia pelas sínteses gravadas e os
 * avisos de empate e de fim de competição. Um teste do botão só provaria que ele
 * chama a API — que é justamente a parte menos interessada.
 */

const SALA = sala({ id: 'sala-1', nome: '2º DS', escola: ESCOLA_A })
const LECIONAMENTO = lecionamento({ id: 'lec-1', salaId: SALA.id })

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })
const BIA = aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' })
const ALUNOS = [ANA, BIA]

const COMPETICAO = competicao({
  id: 'comp-1',
  nome: 'Copa do Conhecimento',
  lecionamentoId: LECIONAMENTO.id,
})

/** Matérias do lecionamento, para a recusa por pesos apontar duas pendências. */
const MATEMATICA = materia({ componenteCurricularId: 'mat-1', materiaNome: 'Matemática' })
const GEOGRAFIA = materia({ componenteCurricularId: 'mat-2', materiaNome: 'Geografia' })

/** Uma matéria fechada em 100%, para as abas de componentes e lançamentos responderem. */
const MATEMATICA_FECHADA = materiaFechada('mat-1', 'Matemática', ['Prova bimestral', 100])

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: { id: PROFESSOR_DE_TESTE, tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
  })
}

/** Os quatro bimestres, com o indicado aberto e os outros já encerrados. */
function quatroBimestres(aberto: number): Bimestre[] {
  return [1, 2, 3, 4].map((numero) =>
    bimestre({
      id: `b${numero}`,
      competicaoId: COMPETICAO.id,
      numero,
      situacao: numero === aberto ? SITUACAO_BIMESTRE.ABERTO : SITUACAO_BIMESTRE.ENCERRADO,
    }),
  )
}

/**
 * Cenário da página: competição com os bimestres, sala, lecionamento, alunos e
 * grupos. Quem muda de comportamento (o encerramento) entra por fora, com
 * `server.use(...)`.
 */
function cenario(bimestres: Bimestre[]) {
  return [
    http.get(`${API}/competicoes/:id`, () =>
      HttpResponse.json({ ...COMPETICAO, bimestres }),
    ),
    ...salasDoProfessor([SALA], { [SALA.id]: [LECIONAMENTO] }),
    http.get(`${API}/salas/:salaId/alunos`, () => HttpResponse.json(ALUNOS)),
    http.get(`${API}/competicoes/:id/grupos`, ({ request }) => {
      const bimestreId = new URL(request.url).searchParams.get('bimestreId') ?? 'b1'

      return HttpResponse.json({
        bimestreId,
        grupos: [
          {
            ...grupo({ id: 'g1', nome: 'Equipe Alfa', competicaoId: COMPETICAO.id }),
            membrosGrupos: [membro('g1', ANA, bimestreId)],
          },
          {
            ...grupo({ id: 'g2', nome: 'Equipe Beta', competicaoId: COMPETICAO.id }),
            membrosGrupos: [membro('g2', BIA, bimestreId)],
          },
        ],
      })
    }),
    // As abas de componentes e lançamentos também precisam responder: o critério
    // de aceite da Etapa 07 é que elas fiquem travadas depois do encerramento, e
    // trava de tela que nem carrega não prova nada.
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(respostaDeComponentes(String(params.id), [MATEMATICA_FECHADA])),
    ),
    http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
      HttpResponse.json(validacaoDePesos([MATEMATICA_FECHADA])),
    ),
    ...listagemDeLancamentos([]),
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

/** O botão da página, para distingui-lo do botão de confirmação do modal. */
function botaoDeEncerrar() {
  return screen.getByRole('button', { name: 'Encerrar bimestre' })
}

/** O que está dentro do modal aberto. */
function modal() {
  return screen.getByRole('dialog')
}

describe('Encerramento de bimestre', () => {
  it('não chama a API só por abrir o modal, e chama ao confirmar', async () => {
    const pessoa = userEvent.setup()
    let chamadas = 0

    const bimestres = quatroBimestres(1)
    server.use(
      ...cenario(bimestres),
      http.post(`${API}/bimestres/:id/encerrar`, () => {
        chamadas += 1
        return HttpResponse.json(encerramento({ bimestreId: 'b1', numero: 1 }))
      }),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    await pessoa.click(botaoDeEncerrar())

    // Abrir o modal é só ler as consequências: quem confere a síntese antes de
    // decidir abre e fecha sem querer tocar numa transação.
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(chamadas).toBe(0)

    // Cancelar também não chama: a resposta esperada é nenhuma.
    await pessoa.click(within(modal()).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas).toBe(0)

    // Só o clique de confirmação chama, e o modal avisa o que vai acontecer.
    await pessoa.click(botaoDeEncerrar())
    const confirmar = within(modal()).getByRole('button', { name: 'Sim, encerrar o 1º Bimestre' })
    expect(confirmar).toBeInTheDocument()
    await pessoa.click(confirmar)

    await waitFor(() => expect(chamadas).toBe(1))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('desabilita o botão quando o bimestre selecionado já está encerrado', async () => {
    server.use(...cenario(quatroBimestres(1)))
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    expect(botaoDeEncerrar()).toBeEnabled()

    // O b2 já está encerrado: a ação irreversível não pode ser re-disparada.
    await userEvent.setup().selectOptions(screen.getByLabelText('Bimestre'), 'b2')

    await waitFor(() => expect(botaoDeEncerrar()).toBeDisabled())
    expect(botaoDeEncerrar()).toHaveAttribute('title', '2º Bimestre já está encerrado.')
  })

  it('lista as matérias pendentes do 400 e oferece voltar aos componentes', async () => {
    const pessoa = userEvent.setup()

    server.use(
      ...cenario(quatroBimestres(1)),
      encerramentoRecusadoPorPesos([
        {
          componenteCurricularId: MATEMATICA.componenteCurricularId,
          materiaNome: MATEMATICA.materiaNome,
          somaPesoPercentual: 70,
          faltaParaFechar: 30,
        },
        {
          componenteCurricularId: GEOGRAFIA.componenteCurricularId,
          materiaNome: GEOGRAFIA.materiaNome,
          somaPesoPercentual: 0,
          faltaParaFechar: 100,
        },
      ]),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    await pessoa.click(botaoDeEncerrar())
    await pessoa.click(await screen.findByRole('button', { name: 'Sim, encerrar o 1º Bimestre' }))

    // A recusa é uma lista de tarefas, não um "algo deu errado": o professor precisa
    // ver exatamente o que falta, com o quanto falta.
    expect(
      await within(modal()).findByText('Matemática — soma em 70%, faltam 30%'),
    ).toBeInTheDocument()
    expect(within(modal()).getByText('Geografia — soma em 0%, faltam 100%')).toBeInTheDocument()
    expect(
      within(modal()).getByText('O bimestre continua aberto. A API recusou o encerramento:'),
    ).toBeInTheDocument()

    // Insistir sem corrigir devolveria o mesmo 400: quem fecha o caminho é o
    // atalho para a aba que corrige.
    expect(within(modal()).queryByRole('button', { name: /Sim, encerrar/ })).not.toBeInTheDocument()

    await pessoa.click(within(modal()).getByRole('button', { name: 'Ir para os componentes' }))

    // O atalho é uma saída do modal, não só uma troca de aba: se a janela ficasse
    // aberta, o formulário de pesos estaria escondido atrás dela.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Componentes' })).toHaveAttribute('aria-selected', 'true')
  })

  it('aceita o encerramento, muda a situação para Encerrado e trava as abas de montagem', async () => {
    const pessoa = userEvent.setup()
    const bimestres = quatroBimestres(1)

    server.use(
      ...cenario(bimestres),
      encerramentoAceito(
        encerramento({
          bimestreId: 'b1',
          numero: 1,
          totais: { alunos: 2, materias: 1, grupos: 2 },
          sinteseAluno: [sinteseDoAluno('b1', ANA, 8.2), sinteseDoAluno('b1', BIA, 7.9)],
          sinteseGrupo: [
            sinteseDoGrupo('b1', 'g1', 'Equipe Alfa', 8.2),
            sinteseDoGrupo('b1', 'g2', 'Equipe Beta', 7.9),
          ],
        }),
        bimestres,
      ),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    await pessoa.click(botaoDeEncerrar())
    await pessoa.click(await screen.findByRole('button', { name: 'Sim, encerrar o 1º Bimestre' }))

    // A etiqueta vem do servidor: a situação nova chega no recarregamento, e não
    // de um palpite local.
    await waitFor(() => expect(screen.getAllByText('Encerrado')).toHaveLength(4))
    expect(screen.queryByText('Aberto')).not.toBeInTheDocument()
    await waitFor(() => expect(botaoDeEncerrar()).toBeDisabled())

    // Etapa 04: a composição dos grupos do bimestre fechado é só de leitura.
    await pessoa.click(screen.getByRole('tab', { name: 'Grupos' }))
    await waitFor(() => expect(screen.getByLabelText('Grupo de Ana')).toBeDisabled())
    expect(
      screen.getByText(/Este bimestre está encerrado\. A composição dos grupos fica só de/),
    ).toBeInTheDocument()

    // Etapa 05 e 06: os componentes e os lançamentos também.
    await pessoa.click(screen.getByRole('tab', { name: 'Componentes' }))
    expect(
      await screen.findByText(
        /Este bimestre está encerrado\. Os pesos e os componentes ficam só de leitura/,
      ),
    ).toBeInTheDocument()

    await pessoa.click(screen.getByRole('tab', { name: 'Lançamentos' }))
    await pessoa.selectOptions(await screen.findByLabelText('Componente de pontuação'), 'mat-1-cp1')
    expect(
      await screen.findByText(/Este bimestre está encerrado\. As notas lançadas ficam só de leitura/),
    ).toBeInTheDocument()

    // E a prévia dá lugar à síntese que a API gravou, com a nota do payload — não
    // a conta do navegador.
    await pessoa.click(screen.getByRole('tab', { name: 'Síntese' }))
    expect(screen.getByRole('tab', { name: 'Síntese' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText(/Síntese oficial do 1º Bimestre, gravada pela API em/)).toBeInTheDocument()
    expect(within(await screen.findByRole('row', { name: /^Ana/ })).getByText('8.20')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Equipe Alfa/ })).getByText('8.20')).toBeInTheDocument()
  })

  it('avisa o empate detectado no encerramento, com a nota que o empatou', async () => {
    const pessoa = userEvent.setup()
    const bimestres = quatroBimestres(1)

    server.use(
      ...cenario(bimestres),
      encerramentoAceito(
        encerramento({
          bimestreId: 'b1',
          numero: 1,
          totais: { alunos: 2, materias: 1, grupos: 2 },
          sinteseAluno: [sinteseDoAluno('b1', ANA, 8.2), sinteseDoAluno('b1', BIA, 8.2)],
          sinteseGrupo: [
            sinteseDoGrupo('b1', 'g1', 'Equipe Alfa', 8.2),
            sinteseDoGrupo('b1', 'g2', 'Equipe Beta', 8.2),
          ],
          empates: [
            empate('b1', 8.2, [
              { grupoId: 'g1', nome: 'Equipe Alfa' },
              { grupoId: 'g2', nome: 'Equipe Beta' },
            ]),
          ],
        }),
        bimestres,
      ),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    await pessoa.click(botaoDeEncerrar())
    await pessoa.click(await screen.findByRole('button', { name: 'Sim, encerrar o 1º Bimestre' }))

    // O empate é o que o encerramento tem de imperfeito, e ele precisa aparecer
    // no topo da página — não enterrado no fim de uma tabela.
    const aviso = await screen.findByText('2 equipes empataram no 1º Bimestre.')
    expect(aviso).toBeInTheDocument()
    // A linha do empate junta a nota que empatou com as equipes: `8.20 — Equipe
    // Alfa e Equipe Beta`. O `alert` acota a busca, porque a página também tem a
    // lista de bimestres, que é uma `<ul>` de itens.
    const faixa = within(await screen.findByRole('alert'))
    expect(faixa.getByRole('listitem')).toHaveTextContent('8.20 — Equipe Alfa e Equipe Beta')
    // E o caminho para resolver fica à mão, com a promessa de quando chega.
    expect(screen.getByRole('button', { name: 'Resolver desempate' })).toHaveAttribute(
      'title',
      'Chega na Etapa 09',
    )
  })

  it('sinaliza a conclusão da competição ao encerrar o 4º bimestre', async () => {
    const pessoa = userEvent.setup()
    const bimestres = quatroBimestres(4)

    server.use(
      ...cenario(bimestres),
      encerramentoAceito(
        encerramento({
          bimestreId: 'b4',
          numero: 4,
          totais: { alunos: 2, materias: 1, grupos: 2 },
          sinteseAluno: [sinteseDoAluno('b4', ANA, 8.4)],
          sinteseGrupo: [sinteseDoGrupo('b4', 'g1', 'Equipe Alfa', 8.4)],
          competicaoConcluida: true,
          pontuacoesFinais: [{ grupoId: 'g1', nome: 'Equipe Alfa', valor: 33.1 }],
        }),
        bimestres,
      ),
    )
    abrirSessao()

    renderizarDetalhe()
    await screen.findAllByText('Equipe Alfa')

    // O 4º é o único aberto do cenário, então é nele que a página abre.
    expect(screen.getByLabelText('Bimestre')).toHaveValue('b4')
    await pessoa.click(botaoDeEncerrar())
    await pessoa.click(await screen.findByRole('button', { name: 'Sim, encerrar o 4º Bimestre' }))

    expect(
      await screen.findByText('Competição concluída — todos os bimestres estão encerrados.'),
    ).toBeInTheDocument()
    // O atalho aponta para o ranking, que é a Etapa 08 — de fora, mas à vista.
    expect(screen.getByRole('button', { name: 'Ver o ranking final' })).toHaveAttribute(
      'title',
      'Chega na Etapa 08',
    )
  })
})

/*
 * A leitura da recusa fica fora do teste de tela porque o que ela tem de difícil
 * não é aparecer: é o corpo do erro, que o NestJS devolve em duas formas — com a
 * lista no topo do corpo, ou aninhada dentro de `message` quando a exceção foi
 * montada com objeto. Uma das duas formas sumindo é o tipo de coisa que só
 * aparece em produção, e a tela perde justamente a lista que o professor precisa.
 */
describe('recusaDoEncerramento', () => {
  const MATERIAS = [
    {
      componenteCurricularId: 'mat-1',
      materiaNome: 'Matemática',
      somaPesoPercentual: 70,
      faltaParaFechar: 30,
    },
  ]

  /** Um erro de axios com o corpo que a API devolveu, como o axios o monta. */
  function falhaCom(corpo: unknown) {
    return new AxiosError('Requisição recusada', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: corpo,
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} as never },
    } as never)
  }

  it('lê a lista de pendências do topo do corpo', () => {
    const lida = recusaDoEncerramento(falhaCom({ message: 'Pesos abertos.', materiasPendentes: MATERIAS }))

    expect(lida.materiasPendentes).toEqual(MATERIAS)
    expect(lida.mensagem).toBe('Pesos abertos.')
    expect(lida.tempoEsgotado).toBe(false)
  })

  it('lê a lista de pendências de dentro da message', () => {
    const lida = recusaDoEncerramento(falhaCom({ message: { materiasPendentes: MATERIAS } }))

    expect(lida.materiasPendentes).toEqual(MATERIAS)
    // Sem texto da API, a regra é escrita em português em vez de repetir o 400.
    expect(lida.mensagem).toMatch(/100%/)
  })

  it('marca o tempo estourado, para a tela mandar recarregar em vez de reenviar', () => {
    const lida = recusaDoEncerramento(new AxiosError('timeout', 'ECONNABORTED'))

    expect(lida.tempoEsgotado).toBe(true)
    expect(lida.mensagem).toMatch(/Recarregue a página/)
    expect(lida.materiasPendentes).toEqual([])
  })
})
