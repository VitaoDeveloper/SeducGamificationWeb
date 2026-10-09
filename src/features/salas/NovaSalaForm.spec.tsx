import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, ESCOLA_A, ESCOLA_B, sala } from '../../test/handlers'
import { NovaSalaForm } from './NovaSalaForm'

const CRIADA = sala({ id: 'sala-nova', nome: '2º DS', anoLetivo: 2026, escola: ESCOLA_A })

describe('NovaSalaForm', () => {
  it('não oferece o select de escola quando só há uma vinculada', async () => {
    renderComSessao(
      <NovaSalaForm escolas={[ESCOLA_A]} onSalva={vi.fn()} onCancelar={vi.fn()} />,
    )

    expect(screen.queryByLabelText(/^escola/i)).not.toBeInTheDocument()
    // Mesmo escondido, o campo é obrigatório na API — o valor sai do único item.
    expect(screen.getByLabelText(/nome da sala/i)).toBeInTheDocument()
  })

  it('exige nome e escola quando há mais de uma escola', async () => {
    const pessoa = userEvent.setup()
    const onSalva = vi.fn()
    let chamouACriacao = false

    server.use(
      http.post(`${API}/salas`, () => {
        chamouACriacao = true
        return HttpResponse.json(CRIADA, { status: 201 })
      }),
    )

    renderComSessao(
      <NovaSalaForm escolas={[ESCOLA_A, ESCOLA_B]} onSalva={onSalva} onCancelar={vi.fn()} />,
    )

    await pessoa.click(screen.getByRole('button', { name: /criar sala/i }))

    expect(await screen.findByText('Informe o nome da sala.')).toBeInTheDocument()
    expect(screen.getByText('Escolha a escola.')).toBeInTheDocument()
    expect(onSalva).not.toHaveBeenCalled()
    expect(chamouACriacao).toBe(false)
  })

  it('recusa ano letivo fora da faixa aceita pela API', async () => {
    const pessoa = userEvent.setup()
    const onSalva = vi.fn()

    renderComSessao(
      <NovaSalaForm escolas={[ESCOLA_A]} onSalva={onSalva} onCancelar={vi.fn()} />,
    )

    await pessoa.clear(screen.getByLabelText(/ano letivo/i))
    await pessoa.type(screen.getByLabelText(/ano letivo/i), '1990')
    await pessoa.type(screen.getByLabelText(/nome da sala/i), '2º DS')
    await pessoa.click(screen.getByRole('button', { name: /criar sala/i }))

    expect(
      await screen.findByText('O ano letivo deve estar entre 2000 e 2100.'),
    ).toBeInTheDocument()
    expect(onSalva).not.toHaveBeenCalled()
  })

  it('envia nome, ano letivo e a escola escolhida, e devolve a sala criada', async () => {
    const pessoa = userEvent.setup()
    let corpoEnviado: unknown

    server.use(
      http.post(`${API}/salas`, async ({ request }) => {
        corpoEnviado = await request.json()
        return HttpResponse.json(CRIADA, { status: 201 })
      }),
    )

    const onSalva = vi.fn()
    renderComSessao(
      <NovaSalaForm escolas={[ESCOLA_A, ESCOLA_B]} onSalva={onSalva} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da sala/i), '2º DS')
    await pessoa.selectOptions(screen.getByLabelText(/^escola/i), ESCOLA_B.id)
    await pessoa.click(screen.getByRole('button', { name: /criar sala/i }))

    expect(onSalva).toHaveBeenCalledWith(CRIADA)
    expect(corpoEnviado).toEqual({
      nome: '2º DS',
      anoLetivo: new Date().getFullYear(),
      escolaId: ESCOLA_B.id,
    })
  })

  it('mostra a mensagem da API quando o professor não tem vínculo com a escola', async () => {
    const pessoa = userEvent.setup()
    const onSalva = vi.fn()

    server.use(
      http.post(`${API}/salas`, () =>
        HttpResponse.json(
          { statusCode: 403, message: 'Professor não vinculado a esta escola.' },
          { status: 403 },
        ),
      ),
    )

    renderComSessao(
      <NovaSalaForm escolas={[ESCOLA_A]} onSalva={onSalva} onCancelar={vi.fn()} />,
    )

    await pessoa.type(screen.getByLabelText(/nome da sala/i), '2º DS')
    await pessoa.click(screen.getByRole('button', { name: /criar sala/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Professor não vinculado a esta escola.')
    expect(onSalva).not.toHaveBeenCalled()
  })

  it('bloqueia a criação e explica quando o professor não tem escola vinculada', () => {
    renderComSessao(
      <NovaSalaForm escolas={[]} onSalva={vi.fn()} onCancelar={vi.fn()} />,
    )

    /*
     * Lista vazia aqui significa uma coisa só: a API respondeu `GET /escolas` sem
     * nenhuma. Como o `POST /salas` exige `escolaId` e valida o vínculo, não há
     * envio possível — e o aviso aponta o mantenedor, que é quem faz o vínculo.
     */
    expect(screen.getByText(/nenhuma escola está vinculada ao seu usuário/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar sala/i })).toHaveAttribute("aria-disabled", "true")
  })

  it('edita a sala com os campos preenchidos e a escola travada, e envia só nome e ano', async () => {
    const pessoa = userEvent.setup()
    const onSalva = vi.fn()
    let corpoEnviado: unknown

    server.use(
      http.patch(`${API}/salas/:salaId`, async ({ request }) => {
        corpoEnviado = await request.json()
        return HttpResponse.json(CRIADA)
      }),
    )

    renderComSessao(<NovaSalaForm sala={CRIADA} onSalva={onSalva} onCancelar={vi.fn()} />)

    // Modo edição: campos pré-preenchidos e a escola aparece travada, sem select.
    expect(screen.getByRole('heading', { name: 'Editar sala' })).toBeInTheDocument()
    expect(screen.getByLabelText(/nome da sala/i)).toHaveValue('2º DS')
    expect(screen.getByLabelText(/ano letivo/i)).toHaveValue(2026)
    expect(screen.getByLabelText(/^escola/i)).toHaveValue(ESCOLA_A.nome)
    expect(screen.getByLabelText(/^escola/i)).toBeDisabled()

    await pessoa.clear(screen.getByLabelText(/nome da sala/i))
    await pessoa.type(screen.getByLabelText(/nome da sala/i), '3º DS')
    await pessoa.click(screen.getByRole('button', { name: /salvar alterações/i }))

    // A escola não entra no corpo: a sala não troca de escola.
    expect(onSalva).toHaveBeenCalledWith(CRIADA)
    expect(corpoEnviado).toEqual({ nome: '3º DS', anoLetivo: 2026 })
  })
})

