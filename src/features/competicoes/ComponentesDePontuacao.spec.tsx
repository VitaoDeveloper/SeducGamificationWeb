import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  API,
  bimestre,
  componentesDoBimestre,
  materia,
  materiaFechada,
  validacaoDePesos,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre } from './competicoes.tipos'
import { ComponentesDePontuacao } from './ComponentesDePontuacao'
import type { MateriaComPesos } from './componentes-pontuacao.tipos'
import type { ComponenteCurricular } from '../salas/salas.tipos'

const LEC_ID = 'lec-1'

const LECCIONAMENTO: ComponenteCurricular[] = [
  { id: 'mat-1', nome: 'Matemática', lecionamentoId: LEC_ID },
  { id: 'mat-2', nome: 'Português', lecionamentoId: LEC_ID },
]

function bimestreDoTeste(situacao: Bimestre['situacao'] = SITUACAO_BIMESTRE.ABERTO): Bimestre {
  return bimestre({ id: 'b1', competicaoId: 'comp-1', numero: 1, situacao })
}

const MATEMATICA_FECHADA = materiaFechada('mat-1', 'Matemática', ['Prova bimestral', 60], ['Trabalho', 40])
const PORTUGUES_ABERTA = materia({ componenteCurricularId: 'mat-2', materiaNome: 'Português' })

function comCenario(materias: MateriaComPesos[]) {
  return [
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(componentesDoBimestre(String(params.id), materias)),
    ),
    http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
      HttpResponse.json(validacaoDePesos(materias)),
    ),
  ]
}

describe('ComponentesDePontuacao', () => {
  it('marca a matéria que fecha em 100% e diz quanto falta na outra', async () => {
    server.use(...comCenario([MATEMATICA_FECHADA, PORTUGUES_ABERTA]))

    renderComSessao(
      <ComponentesDePontuacao bimestre={bimestreDoTeste()} componentesCurriculares={LECCIONAMENTO} />,
    )

    // A matéria fechada mostra o 100%; a que não fecha, o quanto falta.
    expect(await screen.findByText('100% ✓')).toBeInTheDocument()
    expect(screen.getByText('faltam 100%')).toBeInTheDocument()

    expect(screen.getByText('Prova bimestral')).toBeInTheDocument()
    expect(screen.getByText('Trabalho')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()

    // E o veredito do topo, que é o mesmo da rota de validar.
    expect(
      await screen.findByText(/Ainda faltam pesos para fechar 100% em 1 matéria\./),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Português — soma em 0%, faltam 100%'),
    ).toBeInTheDocument()
  })

  it('considera fechado quando os centésimos somam 100 sem erro de ponto flutuante', async () => {
    // 33.33 + 33.33 + 33.34 dá 100.00000000000001 em ponto flutuante. Sem o
    // arredondamento de 2 casas, esta matéria apareceria como "faltam 0%".
    const materia = materiaFechada(
      'mat-3',
      'Geografia',
      ['Prova 1', 33.33],
      ['Prova 2', 33.33],
      ['Prova 3', 33.34],
    )

    server.use(...comCenario([materia]))

    renderComSessao(
      <ComponentesDePontuacao bimestre={bimestreDoTeste()} componentesCurriculares={LECCIONAMENTO} />,
    )

    expect(await screen.findByText('100% ✓')).toBeInTheDocument()
    expect(screen.queryByText(/faltam 0%/)).not.toBeInTheDocument()
    expect(
      await screen.findByText(/Todas as matérias fecham 100% neste bimestre\./),
    ).toBeInTheDocument()
  })

  it('avisa que a matéria não tem componente nenhum', async () => {
    server.use(...comCenario([PORTUGUES_ABERTA]))

    renderComSessao(
      <ComponentesDePontuacao bimestre={bimestreDoTeste()} componentesCurriculares={LECCIONAMENTO} />,
    )

    expect(
      await screen.findByText('Nenhum componente nesta matéria. Crie o primeiro acima.'),
    ).toBeInTheDocument()
  })

  it('atualiza a lista e o veredito depois de criar um componente', async () => {
    const pessoa = userEvent.setup()

    // O cenário lê `materias` por referência para que o `POST` de criação possa
    // mudar o estado e os `GET` seguintes já devolvam a matéria fechada — é o que
    // exercita a recarga que o formulário dispara depois de criar.
    let materias: MateriaComPesos[] = [PORTUGUES_ABERTA]

    server.use(
      http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
        HttpResponse.json(componentesDoBimestre(String(params.id), materias)),
      ),
      http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
        HttpResponse.json(validacaoDePesos(materias)),
      ),
      http.post(`${API}/bimestres/:id/componentes-pontuacao`, async ({ request }) => {
        const criado = (await request.json()) as { nome: string; pesoPercentual: number }

        materias = [
          {
            componenteCurricularId: 'mat-2',
            materiaNome: 'Português',
            somaPesoPercentual: criado.pesoPercentual,
            componentesPontuacao: [
              {
                id: 'cp-novo',
                nome: criado.nome,
                pesoPercentual: criado.pesoPercentual,
                componenteCurricularId: 'mat-2',
                createdAt: '2026-01-15T12:00:00.000Z',
              },
            ],
          },
        ]

        return HttpResponse.json(materias[0]!.componentesPontuacao[0], { status: 201 })
      }),
    )

    renderComSessao(
      <ComponentesDePontuacao bimestre={bimestreDoTeste()} componentesCurriculares={LECCIONAMENTO} />,
    )

    expect(await screen.findByText('faltam 100%')).toBeInTheDocument()

    await pessoa.selectOptions(screen.getByLabelText(/^matéria/i), 'mat-2')
    await pessoa.type(screen.getByLabelText(/^componente/i), 'Prova bimestral')
    await pessoa.type(screen.getByLabelText(/^peso/i), '100')
    await pessoa.click(screen.getByRole('button', { name: 'Criar componente' }))

    expect(await screen.findByText('100% ✓')).toBeInTheDocument()
    expect(
      await screen.findByText(/Todas as matérias fecham 100% neste bimestre\./),
    ).toBeInTheDocument()
  })

  it('mostra o erro da listagem com o caminho para tentar de novo', async () => {
    server.use(
      http.get(`${API}/bimestres/:id/componentes-pontuacao`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falha ao listar.' }, { status: 500 }),
      ),
      http.post(`${API}/bimestres/:id/componentes-pontuacao/validar`, () =>
        HttpResponse.json(validacaoDePesos([])),
      ),
    )

    renderComSessao(
      <ComponentesDePontuacao bimestre={bimestreDoTeste()} componentesCurriculares={LECCIONAMENTO} />,
    )

    expect(await screen.findByText('Falha ao listar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('impede criar componente com o bimestre encerrado', async () => {
    const criar = vi.fn()
    server.use(
      ...comCenario([MATEMATICA_FECHADA]),
      http.post(`${API}/bimestres/:id/componentes-pontuacao`, criar),
    )

    renderComSessao(
      <ComponentesDePontuacao
        bimestre={bimestreDoTeste(SITUACAO_BIMESTRE.ENCERRADO)}
        componentesCurriculares={LECCIONAMENTO}
      />,
    )

    expect(
      await screen.findByText(
        /Este bimestre está encerrado\. Os pesos e os componentes ficam só de leitura/,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('O bimestre está encerrado, então não dá para criar componente.'),
    ).toBeInTheDocument()
    // Sem formulário montado, não há nem como disparar o envio.
    expect(screen.queryByRole('button', { name: 'Criar componente' })).not.toBeInTheDocument()
    expect(criar).not.toHaveBeenCalled()
  })
})
