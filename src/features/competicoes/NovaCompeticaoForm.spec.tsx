import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, bimestresDaCompeticao, competicao } from '../../test/handlers'
import { rotuloDoBimestre } from './bimestres'
import { NovaCompeticaoForm } from './NovaCompeticaoForm'

const CRIADA = competicao({
  id: 'comp-1',
  nome: 'Copa do Conhecimento',
  lecionamentoId: 'lec-1',
  bimestres: bimestresDaCompeticao('comp-1'),
})

/** Preenche as duas datas de um bimestre, pelo rótulo do bloco. */
function preencherBimestre(numero: number, inicio: string, fim: string) {
  const bloco = screen.getByRole('group', { name: rotuloDoBimestre(numero) })
  fireEvent.change(within(bloco).getByLabelText('Início'), { target: { value: inicio } })
  fireEvent.change(within(bloco).getByLabelText('Fim'), { target: { value: fim } })
}

function preencherTodosValidos() {
  preencherBimestre(1, '2026-02-01', '2026-04-30')
  preencherBimestre(2, '2026-05-01', '2026-07-15')
  preencherBimestre(3, '2026-08-01', '2026-10-15')
  preencherBimestre(4, '2026-10-16', '2026-12-20')
}

describe('NovaCompeticaoForm', () => {
  it('aponta as datas que faltam em cada bimestre e não chama a API', async () => {
    const pessoa = userEvent.setup()
    let chamou = false

    server.use(
      http.post(`${API}/competicoes`, () => {
        chamou = true
        return HttpResponse.json(CRIADA, { status: 201 })
      }),
    )

    const onCriada = vi.fn()
    renderComSessao(
      <NovaCompeticaoForm lecionamentoId="lec-1" onCriada={onCriada} onCancelar={vi.fn()} />,
    )

    await pessoa.click(screen.getByRole('button', { name: /criar competição/i }))

    expect(screen.getByText('Informe o nome da competição.')).toBeInTheDocument()
    expect(screen.getAllByText('Informe a data de início.')).toHaveLength(4)
    expect(screen.getAllByText('Informe a data de fim.')).toHaveLength(4)
    expect(onCriada).not.toHaveBeenCalled()
    expect(chamou).toBe(false)
  })

  it('bloqueia o envio quando os bimestres se sobrepõem', async () => {
    const pessoa = userEvent.setup()
    let chamou = false

    server.use(
      http.post(`${API}/competicoes`, () => {
        chamou = true
        return HttpResponse.json(CRIADA, { status: 201 })
      }),
    )

    const onCriada = vi.fn()
    renderComSessao(
      <NovaCompeticaoForm lecionamentoId="lec-1" onCriada={onCriada} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da competição/i), 'Copa')
    // O segundo bimestre começa no mesmo dia em que o primeiro termina.
    preencherBimestre(1, '2026-02-01', '2026-04-30')
    preencherBimestre(2, '2026-04-30', '2026-07-15')
    preencherBimestre(3, '2026-08-01', '2026-10-15')
    preencherBimestre(4, '2026-10-16', '2026-12-20')

    await pessoa.click(screen.getByRole('button', { name: /criar competição/i }))

    expect(
      await screen.findByText(
        'Os bimestres precisam ficar em ordem crescente, sem datas sobrepostas.',
      ),
    ).toBeInTheDocument()
    expect(onCriada).not.toHaveBeenCalled()
    expect(chamou).toBe(false)
  })

  it('acusa o fim antes do início no bloco certo', async () => {
    const pessoa = userEvent.setup()

    renderComSessao(
      <NovaCompeticaoForm lecionamentoId="lec-1" onCriada={vi.fn()} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da competição/i), 'Copa')
    preencherBimestre(1, '2026-04-30', '2026-02-01')

    await pessoa.click(screen.getByRole('button', { name: /criar competição/i }))

    const bloco = screen.getByRole('group', { name: rotuloDoBimestre(1) })
    expect(
      within(bloco).getByText('A data de fim deve ser depois da data de início.'),
    ).toBeInTheDocument()
  })

  it('envia os quatro bimestres em ISO e devolve a competição criada', async () => {
    const pessoa = userEvent.setup()
    let corpoEnviado: unknown

    server.use(
      http.post(`${API}/competicoes`, async ({ request }) => {
        corpoEnviado = await request.json()
        return HttpResponse.json(CRIADA, { status: 201 })
      }),
    )

    const onCriada = vi.fn()
    renderComSessao(
      <NovaCompeticaoForm lecionamentoId="lec-1" onCriada={onCriada} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da competição/i), 'Copa do Conhecimento')
    preencherTodosValidos()
    await pessoa.click(screen.getByRole('button', { name: /criar competição/i }))

    expect(onCriada).toHaveBeenCalledWith(CRIADA)
    expect(corpoEnviado).toEqual({
      nome: 'Copa do Conhecimento',
      lecionamentoId: 'lec-1',
      bimestres: [
        { numero: 1, dataInicio: '2026-02-01T00:00:00.000Z', dataFim: '2026-04-30T00:00:00.000Z' },
        { numero: 2, dataInicio: '2026-05-01T00:00:00.000Z', dataFim: '2026-07-15T00:00:00.000Z' },
        { numero: 3, dataInicio: '2026-08-01T00:00:00.000Z', dataFim: '2026-10-15T00:00:00.000Z' },
        { numero: 4, dataInicio: '2026-10-16T00:00:00.000Z', dataFim: '2026-12-20T00:00:00.000Z' },
      ],
    })
  })

  it('mostra a mensagem da API quando a criação é recusada', async () => {
    const pessoa = userEvent.setup()
    const onCriada = vi.fn()

    server.use(
      http.post(`${API}/competicoes`, () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Já existe uma competição com esse nome nesta sala.' },
          { status: 409 },
        ),
      ),
    )

    renderComSessao(
      <NovaCompeticaoForm lecionamentoId="lec-1" onCriada={onCriada} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da competição/i), 'Copa')
    preencherTodosValidos()
    await pessoa.click(screen.getByRole('button', { name: /criar competição/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Já existe uma competição com esse nome nesta sala.',
    )
    expect(onCriada).not.toHaveBeenCalled()
  })
})
