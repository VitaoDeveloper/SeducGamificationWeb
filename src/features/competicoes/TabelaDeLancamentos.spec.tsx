import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  API,
  aluno,
  componentePontuacao,
  lancamento,
  lancamentosDoComponente,
  listagemDeLancamentos,
  materia,
} from '../../test/handlers'
import { formatarSintese, sinteseDaMateria } from '../../lib/sinteseCalculo'
import { MODELO_CPS_ETEC, MODELO_NUMERICO } from '../../test/modelos-de-avaliacao'
import { TabelaDeLancamentos } from './TabelaDeLancamentos'
import type { Lancamento, MateriaComPesos } from './componentes-pontuacao.tipos'

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

/**
 * A matéria a que o componente pertence.
 *
 * Entra com um componente só, e é o `COMPONENTE` de verdade: a prévia soma os
 * pesos da matéria, e com um componente só ela dá a própria nota. Os cenários com
 * mais de um componente montam a matéria na hora, com `materiaDe`.
 */
const MATERIA = materiaDe([{ id: 'cp-1', nome: 'Prova bimestral', pesoPercentual: 100 }])

/** Uma matéria com os componentes que o cenário pedir, sempre em "Matemática". */
function materiaDe(
  componentes: Array<{ id: string; nome: string; pesoPercentual: number }>,
): MateriaComPesos {
  return materia(
    { componenteCurricularId: 'mat-1', materiaNome: 'Matemática' },
    componentes.map((componente) => componentePontuacao({ ...componente, componenteCurricularId: 'mat-1' })),
  )
}

/**
 * A matéria do doc 03: Prova 50%, Caderno 20%, Projeto 30%.
 *
 * O componente em lançamento é o primeiro, e os outros dois vêm de lançamento já
 * salvo — que é o cenário real: o professor lança a prova e a prévia precisa
 * levar em conta o caderno e o projeto que ele fechou antes.
 */
const MATERIA_DO_DOC = materiaDe([
  { id: 'cp-1', nome: 'Prova', pesoPercentual: 50 },
  { id: 'cp-2', nome: 'Caderno', pesoPercentual: 20 },
  { id: 'cp-3', nome: 'Projeto', pesoPercentual: 30 },
])

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
        materia={MATERIA}
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
        materia={MATERIA}
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

  it('não monta campo nenhum quando a API não informou o modelo da escola', async () => {
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, 'B')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        materia={MATERIA}
        alunos={ALUNOS}
        modelo={null}
        encerrado={false}
      />,
    )

    /*
     * Este é o caminho que evita o bug, e não um detalhe: com um modelo qualquer
     * inventado, a escola numérica receberia o seletor de conceitos e o
     * `LancamentosService` recusaria o lote com 400, depois de o professor ter
     * lançado a turma inteira. Sem modelo, não há o que lançar.
     */
    expect(await screen.findByRole('alert')).toHaveTextContent(/não informou o modelo de avaliação/i)
    expect(screen.queryByLabelText('Nota de Ana')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Conceito de Ana')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument()
  })

  it('deixa o campo vazio no aluno sem lançamento, sem travar os outros', async () => {
    server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '7')], ALUNOS))

    renderComSessao(
      <TabelaDeLancamentos
        componente={COMPONENTE}
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
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
        materia={MATERIA}
        alunos={[]}
        modelo={MODELO_NUMERICO}
        encerrado={false}
      />,
    )

    expect(
      screen.getByText(/Nenhum aluno matriculado nesta sala ainda\./),
    ).toBeInTheDocument()
  })

  /*
   * A coluna de prévia (Etapa 06). O critério de aceite é o valor mostrado bater
   * com o utilitário de cálculo, e a conferência é feita recalculando com
   * `sinteseDaMateria` a partir dos mesmos lançamentos do cenário — não com o
   * número esperado escrito à mão, que só provaria que o teste e a tela mudaram
   * juntos.
   */
  describe('coluna de prévia', () => {
    const PROVA = componentePontuacao({
      id: 'cp-1',
      nome: 'Prova',
      pesoPercentual: 50,
      componenteCurricularId: 'mat-1',
    })

    /** Os lançamentos salvos nos componentes que não estão em edição. */
    function notasSalvasDosIrmãos(): Lancamento[] {
      return [lancamento('cp-2', ANA, '10'), lancamento('cp-3', ANA, '6')]
    }

    /**
     * O que a prévia da Ana deve mostrar, calculado pelo utilitário.
     *
     * Recebe a nota da prova como texto — o mesmo que estaria no campo — para que
     * o teste compare a tela com a conta, e não com um número escrito à mão.
     */
    function previaEsperadaDaAna(notaDaProva: string | undefined): string {
      return formatarSintese(
        sinteseDaMateria(
          [
            { valorNoModelo: notaDaProva, pesoPercentual: 50 },
            { valorNoModelo: '10', pesoPercentual: 20 },
            { valorNoModelo: '6', pesoPercentual: 30 },
          ],
          { tipoEscala: 'NUMERICA', niveis: [] },
        ),
      )
    }

    it('acompanha a digitação, sem esperar o salvamento', async () => {
      server.use(...lancamentosDoComponente(notasSalvasDosIrmãos(), ALUNOS))

      const pessoa = userEvent.setup()
      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA_DO_DOC}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado={false}
        />,
      )

      // Antes de digitar, a prévia já sai dos lançamentos que o banco tem: 10×0,2
      // + 6×0,3 = 3,8. Sem a nota da prova, que ainda está no campo em branco.
      const linhaDaAna = await screen.findByRole('row', { name: /Ana/ })
      await waitFor(() =>
        expect(within(linhaDaAna).getByText(previaEsperadaDaAna(undefined))).toBeInTheDocument(),
      )
      expect(previaEsperadaDaAna(undefined)).toBe('3.80')

      // O exemplo do doc 03: 8×0,5 + 10×0,2 + 6×0,3 = 7,8.
      await pessoa.type(screen.getByLabelText('Nota de Ana'), '8')

      expect(await within(linhaDaAna).findByText(previaEsperadaDaAna('8'))).toBeInTheDocument()
      expect(previaEsperadaDaAna('8')).toBe('7.80')
    })

    it('trata aluno sem lançamento como 0, e não como falta de dado', async () => {
      server.use(...lancamentosDoComponente(notasSalvasDosIrmãos(), ALUNOS))

      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA_DO_DOC}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado={false}
        />,
      )

      // A Bia não tem lançamento em componente nenhum da matéria: 0,00. A prévia
      // não some e não mostra "—", porque a API trata o lançamento ausente como
      // nota 0 e é esse o número que ela vai gravar.
      const linhaDaBia = await screen.findByRole('row', { name: /Bia/ })
      expect(within(linhaDaBia).getByText('0.00')).toBeInTheDocument()
    })

    /*
     * A prévia é recalculada a cada tecla, e o campo passa por "1" e "11" enquanto
     * o professor digita. Sem a validação do modelo na entrada da conta, o "11"
     * entraria como 11 e a linha mostraria uma síntese que a API jamais receberia.
     */
    it('ignora nota fora do modelo, que a API recusaria', async () => {
      server.use(...lancamentosDoComponente(notasSalvasDosIrmãos(), ALUNOS))

      const pessoa = userEvent.setup()
      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA_DO_DOC}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado={false}
        />,
      )

      const linhaDaAna = await screen.findByRole('row', { name: /Ana/ })
      await waitFor(() =>
        expect(within(linhaDaAna).getByText(previaEsperadaDaAna(undefined))).toBeInTheDocument(),
      )

      await pessoa.type(screen.getByLabelText('Nota de Ana'), '11')

      // A prévia volta a ser a de "sem lançamento na prova": 10×0,2 + 6×0,3.
      expect(within(linhaDaAna).getByText(previaEsperadaDaAna(undefined))).toBeInTheDocument()
      expect(within(linhaDaAna).queryByText(previaEsperadaDaAna('11'))).not.toBeInTheDocument()
    })

    it('limpar o campo vale como sem lançamento, e não volta para a nota salva', async () => {
      server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '8')], ALUNOS))

      const pessoa = userEvent.setup()
      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado={false}
        />,
      )

      const linhaDaAna = await screen.findByRole('row', { name: /Ana/ })
      expect(within(linhaDaAna).getByText('8.00')).toBeInTheDocument()

      await pessoa.clear(screen.getByLabelText('Nota de Ana'))

      // 8 salvo e depois apagado no campo: o que vale é o campo, que está vazio.
      expect(await within(linhaDaAna).findByText('0.00')).toBeInTheDocument()
    })

    /*
     * Bimestre encerrado, a síntese é a que a API gravou. Recalcular no front
     * mostraria um segundo número para a mesma coisa, e a Etapa 06 deixa isso fora
     * de escopo — então a coluna inteira some, e não fica em 0.
     */
    it('não aparece com o bimestre encerrado', async () => {
      server.use(...lancamentosDoComponente([lancamento('cp-1', ANA, '8')], ALUNOS))

      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado
        />,
      )

      await screen.findByLabelText('Nota de Ana')
      expect(screen.queryByText('Prévia')).not.toBeInTheDocument()
      expect(within(linhaDe('Ana')).queryByText('8.00')).not.toBeInTheDocument()
    })

    it('avisa que a coluna é uma prévia, e não a nota oficial', async () => {
      server.use(...lancamentosDoComponente(notasSalvasDosIrmãos(), ALUNOS))

      renderComSessao(
        <TabelaDeLancamentos
          componente={PROVA}
          materia={MATERIA_DO_DOC}
          alunos={ALUNOS}
          modelo={MODELO_NUMERICO}
          encerrado={false}
        />,
      )

      expect(
        await screen.findByText(/sujeita a alteração até o encerramento do bimestre/i),
      ).toBeInTheDocument()
    })
  })
})
