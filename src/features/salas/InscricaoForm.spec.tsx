import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, lecionamento } from '../../test/handlers'
import { InscricaoForm } from './InscricaoForm'

const CRIADO = lecionamento({ id: 'lec-novo', salaId: 'sala-1' })

describe('InscricaoForm', () => {
  it('exige ao menos um componente e não chama a API sem ele', async () => {
    const pessoa = userEvent.setup()
    const onInscrito = vi.fn()
    let chamouAInscricao = false

    server.use(
      http.post(`${API}/salas/:salaId/inscricao`, () => {
        chamouAInscricao = true
        return HttpResponse.json(CRIADO, { status: 201 })
      }),
    )

    renderComSessao(<InscricaoForm salaId="sala-1" onInscrito={onInscrito} />)
    await pessoa.click(screen.getByRole('button', { name: /inscrever-se na sala/i }))

    expect(await screen.findByText('Informe ao menos um componente curricular.')).toBeInTheDocument()
    expect(onInscrito).not.toHaveBeenCalled()
    expect(chamouAInscricao).toBe(false)
  })

  it('vira cada matéria digitada em etiqueta removível', async () => {
    const pessoa = userEvent.setup()

    renderComSessao(<InscricaoForm salaId="sala-1" onInscrito={vi.fn()} />)

    const campo = screen.getByLabelText(/componentes curriculares/i)
    // Enter fecha a etiqueta e esvazia o campo para a próxima matéria.
    await pessoa.type(campo, 'Programação Web{Enter}Banco de Dados{Enter}')

    expect(screen.getByText('Programação Web')).toBeInTheDocument()
    expect(screen.getByText('Banco de Dados')).toBeInTheDocument()

    await pessoa.click(screen.getByRole('button', { name: 'Remover Programação Web' }))
    expect(screen.queryByText('Programação Web')).not.toBeInTheDocument()
    expect(screen.getByText('Banco de Dados')).toBeInTheDocument()
  })

  it('envia os componentes e devolve o lecionamento criado', async () => {
    const pessoa = userEvent.setup()
    let corpoEnviado: unknown

    server.use(
      http.post(`${API}/salas/:salaId/inscricao`, async ({ request }) => {
        corpoEnviado = await request.json()
        return HttpResponse.json(CRIADO, { status: 201 })
      }),
    )

    const onInscrito = vi.fn()
    renderComSessao(<InscricaoForm salaId="sala-1" onInscrito={onInscrito} />)

    await pessoa.type(
      screen.getByLabelText(/componentes curriculares/i),
      'Programação Web{Enter}Banco de Dados{Enter}',
    )
    await pessoa.click(screen.getByRole('button', { name: /inscrever-se na sala/i }))

    expect(onInscrito).toHaveBeenCalledWith(CRIADO)
    expect(corpoEnviado).toEqual({ componentes: ['Programação Web', 'Banco de Dados'] })
  })

  it('mostra o erro da API quando a inscrição já existe (409)', async () => {
    const pessoa = userEvent.setup()
    const onInscrito = vi.fn()

    server.use(
      http.post(`${API}/salas/:salaId/inscricao`, () =>
        HttpResponse.json(
          { statusCode: 409, message: 'Professor já está inscrito nesta sala.' },
          { status: 409 },
        ),
      ),
    )

    renderComSessao(<InscricaoForm salaId="sala-1" onInscrito={onInscrito} />)

    await pessoa.type(screen.getByLabelText(/componentes curriculares/i), 'História{Enter}')
    await pessoa.click(screen.getByRole('button', { name: /inscrever-se na sala/i }))

    // A frase é a do servidor, não uma inventada pela tela.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Professor já está inscrito nesta sala.',
    )
    expect(onInscrito).not.toHaveBeenCalled()
  })

  it('mostra o erro da API quando o professor não tem vínculo com a escola (403)', async () => {
    const pessoa = userEvent.setup()

    server.use(
      http.post(`${API}/salas/:salaId/inscricao`, () =>
        HttpResponse.json(
          { statusCode: 403, message: 'Professor não vinculado à escola da sala.' },
          { status: 403 },
        ),
      ),
    )

    renderComSessao(<InscricaoForm salaId="sala-1" onInscrito={vi.fn()} />)

    await pessoa.type(screen.getByLabelText(/componentes curriculares/i), 'História{Enter}')
    await pessoa.click(screen.getByRole('button', { name: /inscrever-se na sala/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Professor não vinculado à escola da sala.',
    )
  })
})
