import { render, screen } from '@testing-library/react'
import { Field } from './Field'
import { Select } from './Select'

describe('Select', () => {
  it('dá tamanho fixo à seta, para ela não invadir o campo', () => {
    const { container } = render(
      <Select aria-label="Bimestre" defaultValue="">
        <option value="">Selecione</option>
        <option value="1">1º bimestre</option>
      </Select>,
    )

    // Regressão da seta gigante: o svg só traz `viewBox`, então sem `size-*` o
    // navegador o desenha com o tamanho padrão de elemento substituído
    // (300×150) e a seta ocupa a altura do campo. `size-4` (16px) é o mesmo
    // tamanho dos demais ícones da interface.
    const seta = container.querySelector('svg')
    expect(seta).toHaveClass('size-4')
    expect(seta).not.toHaveAttribute('width')
  })

  it('desenha uma seta só, com a nativa do navegador desligada', () => {
    const { container } = render(
      <Select aria-label="Matéria" defaultValue="">
        <option value="">Selecione</option>
      </Select>,
    )

    // `appearance-none` é o que evita duas setas sobrepostas — a nativa do
    // navegador em cima da customizada. O efeito de `appearance` em si não é
    // verificável no jsdom (o CSS nem entra no ambiente de teste), então o que
    // fica travado aqui é a classe e a unicidade do ícone no DOM; o resultado
    // visual foi conferido no navegador.
    expect(screen.getByRole('combobox')).toHaveClass('appearance-none')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('mantém a seta em todos os estados de erro e desabilitado', () => {
    const { container, rerender } = render(
      <Field label="Escola" error="Escolha uma escola">
        <Select defaultValue="" />
      </Field>,
    )
    expect(container.querySelector('svg')).toHaveClass('size-4')

    rerender(
      <Field label="Escola">
        <Select defaultValue="" disabled />
      </Field>,
    )
    expect(container.querySelector('svg')).toHaveClass('size-4')
  })
})