import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, aluno, componentePontuacao, lancamento, lancamentosDoComponente, listagemDeLancamentos } from '../../test/handlers'
import { MODELO_CPS_ETEC, MODELO_NUMERICO } from './modelo-avaliacao'
import { TabelaDeLancamentos } from './TabelaDeLancamentos'

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })
const BIA = aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' })
const CAIO = aluno({ id: 'a3', nome: 'Caio', codigoMatricula: '26012' })

const ALUNOS = [ANA, BIA, CAIO]

const COMPONENTE = componentePontuacao({
  id: 'cp-1',
  nome: 'Prova bimestral',
  pesoPercentual: 100,
  componenteCurricularId: 'mat-1',
})

/** Um aluno por linha, para o `within` achar o botão só da linha que mudou. */
function linhaDe(nome: string) {
  return screen.getByRole('row', { name: new RegExp(nome) })
}

describe('TabelaDeLancamentos', () => {
  it('usa input numérico no modelo numérico da escola', async () => {
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '8.5')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    const notaDaAna = await screen.findByLabelText('Nota de Ana')
    expect(notaDaAna).toHaveAttribute('type', 'number')
    // A escala é 1 a 10 com passo de centésimo: os limites no input são a
    // primeira linha de defesa, antes de a nota chegar ao servidor.
    expect(notaDaAna).toHaveAttribute('min', '1')
    expect(notaDaAna).toHaveAttribute('max', '10')
    expect(notaDaAna).toHaveAttribute('step', '0.01')
    expect(notaDaAna).toHaveValue(8.5)

    // No modelo numérico não existe seletor de conceito.
    expect(screen.queryByLabelText('Conceito de Ana')).not.toBeInTheDocument()
  })

  it('usa seletor de rótulos no modelo conceitual da escola', async () => {
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, 'B')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_CPS_ETEC}
        encerrado={false}
      />,
    )

    const conceitoDaAna = await screen.findByLabelText('Conceito de Ana')
    expect(conceitoDaAna.tagName).toBe('SELECT')
    expect(conceitoDaAna).toHaveValue('B')

    // Os rótulos do modelo, e "Sem nota" para a linha vazia. A consulta fica
    // presa à linha da Ana porque cada aluno tem o seu seletor.
    for (const rotulo of MODELO_CPS_ETEC.rotulos) {
      expect(within(conceitoDaAna).getByRole('option', { name: rotulo })).toBeInTheDocument()
    }
    expect(within(conceitoDaAna).getByRole('option', { name: 'Sem nota' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota de Ana')).not.toBeInTheDocument()
  })

  it('deixa o campo vazio no aluno sem lançamento, sem travar os outros', async () => {
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '7')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    expect(await screen.findByLabelText('Nota de Ana')).toHaveValue(7)
    expect(screen.getByLabelText('Nota de Bia')).toHaveValue(null)
    expect(screen.getByLabelText('Nota de Caio')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Salvar lançamentos' })).toBeEnabled()
  })

  it('monta o lote só com quem foi preenchido e mostra quantas salvou', async () => {
    const lotes: unknown[] = []
    server.use(
      ...listagemDeLancamentos([]),
      http.post(`${API}/componentes-pontuacao/:id/lancamentos/lote`, async ({ params, request }) => {
        lotes.push({ componente: String(params.id), corpo: await request.json() })

        return HttpResponse.json([], { status: 201 })
      }),
    )

    const pessoa = userEvent.setup()
    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    // A Bia fica em branco de propósito: ela não pode entrar no lote, e o fato de
    // existir uma linha vazia não pode impedir o salvamento das outras.
    await pessoa.type(await screen.findByLabelText('Nota de Ana'), '8.5')
    await pessoa.type(screen.getByLabelText('Nota de Caio'), '6')

    await pessoa.click(screen.getByRole('button', { name: 'Salvar lançamentos' }))

    await waitFor(() => expect(lotes).toHaveLength(1))
    expect(lotes[0]).toEqual({
      componente: 'cp-1',
      corpo: {
        lancamentos: [
          { alunoId: 'a1', valorNoModelo: '8.5' },
          { alunoId: 'a3', valorNoModelo: '6' },
        ],
      },
    })
    expect(await screen.findByText('2 notas salvas.')).toBeInTheDocument()
  })

  it('recusa nota fora da escala antes de enviar', async () => {
    const lotes: unknown[] = []
    server.use(
      ...listagemDeLancamentos([]),
      http.post(`${API}/componentes-pontuacao/:id/lancamentos/lote`, async ({ request }) => {
        lotes.push(await request.json())
        return HttpResponse.json([], { status: 201 })
      }),
    )

    const pessoa = userEvent.setup()
    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    await pessoa.type(await screen.findByLabelText('Nota de Ana'), '11')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar lançamentos' }))

    expect(await screen.findByText('A nota precisa estar entre 1 e 10.')).toBeInTheDocument()
    expect(
      screen.getByText('Corrija as notas destacadas antes de salvar.'),
    ).toBeInTheDocument()
    expect(lotes).toHaveLength(0)
  })

  it('avisa que não há nada a salvar quando nenhuma nota foi preenchida', async () => {
    server.use(...listagemDeLancamentos([]))

    const pessoa = userEvent.setup()
    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    await screen.findByLabelText('Nota de Ana')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar lançamentos' }))

    expect(await screen.findByText('Nenhuma nota preenchida para salvar.')).toBeInTheDocument()
  })

  it('salva uma linha sozinha e só acende o botão da linha que mudou', async () => {
    const salvos: Array<{ alunoId: string; valorNoModelo: string }> = []
    server.use(
      ...listagemDeLancamentos([lancamento('cp-1', ANA, '7')]),
      http.post(`${API}/componentes-pontuacao/:id/lancamentos`, async ({ request }) => {
        const lancada = (await request.json()) as { alunoId: string; valorNoModelo: string }
        salvos.push(lancada)

        return HttpResponse.json(lancamento('cp-1', BIA, lancada.valorNoModelo), { status: 201 })
      }),
    )

    const pessoa = userEvent.setup()
    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    await screen.findByLabelText('Nota de Ana')
    // Sem edição, nenhum botão de linha pode salvar: sem isso, um clique acidental
    // gravaria uma linha vazia por cima do que já estava no banco.
    expect(within(linhaDe('Ana')).getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(within(linhaDe('Bia')).getByRole('button', { name: 'Salvar' })).toBeDisabled()

    await pessoa.type(screen.getByLabelText('Nota de Bia'), '9')

    expect(within(linhaDe('Bia')).getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(within(linhaDe('Ana')).getByRole('button', { name: 'Salvar' })).toBeDisabled()

    await pessoa.click(within(linhaDe('Bia')).getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(salvos).toEqual([{ alunoId: 'a2', valorNoModelo: '9' }]))
    expect(await screen.findByText('Nota de Bia salva.')).toBeInTheDocument()
  })

  it('mostra o erro da API quando o lote é recusado', async () => {
    server.use(
      ...listagemDeLancamentos([]),
      http.post(`${API}/componentes-pontuacao/:id/lancamentos/lote`, () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Bimestre encerrado não aceita lançamentos.' },
          { status: 400 },
        ),
      ),
    )

    const pessoa = userEvent.setup()
    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    await pessoa.type(await screen.findByLabelText('Nota de Ana'), '8')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar lançamentos' }))

    expect(
      await screen.findByText('Bimestre encerrado não aceita lançamentos.'),
    ).toBeInTheDocument()
  })

  it('fica somente leitura com o bimestre encerrado', async () => {
    const pessoa = userEvent.setup()
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '7')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={ALUNOS}
        modelo={MODELO_NUMERICO}
        encerrado
      />,
    )

    expect(await screen.findByLabelText('Nota de Ana')).toBeDisabled()
    expect(screen.getByLabelText('Nota de Bia')).toBeDisabled()
    expect(within(linhaDe('Bia')).getByRole('button', { name: 'Salvar' })).toBeDisabled()
    // O salvamento em lote some por inteiro em vez de ficar um botão morto.
    expect(screen.queryByRole('button', { name: 'Salvar lançamentos' })).not.toBeInTheDocument()
    expect(
      screen.getByText(/Este bimestre está encerrado\. As notas lançadas ficam só de leitura/),
    ).toBeInTheDocument()

    // Confirmado por tentativa, não só pela ausência do botão.
    await pessoa.type(screen.getByLabelText('Nota de Bia'), '9')
    expect(screen.getByLabelText('Nota de Bia')).toHaveValue(null)
  })

  it('avisa quando a sala não tem aluno cadastrado', () => {
    // O hook de lançamentos roda antes do aviso de sala vazia, então a listagem
    // precisa estar respondendo mesmo sem ninguém para lançar.
    server.use(...listagemDeLancamentos([]))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        alunos={[]}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    expect(
      screen.getByText(/Nenhum aluno matriculado nesta sala ainda\./),
    ).toBeInTheDocument()
  })
})
