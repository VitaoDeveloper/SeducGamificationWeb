import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Modal } from './Modal'

/** Abre o modal por um botão de verdade, para o foco ter para onde voltar. */
function ComGatilho() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Aluno cadastrado"
        description="Passe o código para o aluno."
      >
        <p>Conteúdo do diálogo</p>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('anuncia título e descrição e leva o foco para dentro', async () => {
    const pessoa = userEvent.setup()
    render(<ComGatilho />)

    await pessoa.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveAccessibleName('Aluno cadastrado')
    expect(dialogo).toHaveAccessibleDescription('Passe o código para o aluno.')
    // O primeiro focável do cartão é o botão de fechar; o foco começa nele.
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus()
  })

  it('devolve o foco ao gatilho quando fecha', async () => {
    const pessoa = userEvent.setup()
    render(<ComGatilho />)

    const gatilho = screen.getByRole('button', { name: 'Abrir' })
    await pessoa.click(gatilho)

    // Esc é o caminho de teclado; o foco precisa voltar para quem abriu, senão
    // quem navega por teclado perde a posição na página.
    await pessoa.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(gatilho).toHaveFocus()
  })

  it('fecha ao clicar no fundo, mas não ao clicar no cartão', async () => {
    const pessoa = userEvent.setup()
    render(<ComGatilho />)

    await pessoa.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = screen.getByRole('dialog')

    await pessoa.click(screen.getByText('Conteúdo do diálogo'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const fundo = dialogo.previousElementSibling as HTMLElement
    await pessoa.click(fundo)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('chama onClose ao fechar pelo botão', async () => {
    const pessoa = userEvent.setup()
    const onClose = vi.fn()

    render(
      <Modal open onClose={onClose} title="Aluno cadastrado">
        <p>Conteúdo</p>
      </Modal>,
    )

    await pessoa.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('não renderiza nada quando fechado', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Aluno cadastrado">
        <p>Conteúdo</p>
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
