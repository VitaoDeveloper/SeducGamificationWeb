import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import {
  API,
  aluno,
  bimestre,
  componentesDoBimestre,
  lancamento,
  listagemDeLancamentos,
  materiaFechada,
} from '../../test/handlers'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre } from './competicoes.tipos'
import { LancamentosDeComponente } from './LancamentosDeComponente'
import { MODELO_NUMERICO } from './modelo-avaliacao'

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })

function bimestreDoTeste(situacao: Bimestre['situacao'] = SITUACAO_BIMESTRE.ABERTO): Bimestre {
  return bimestre({ id: 'b1', competicaoId: 'comp-1', numero: 1, situacao })
}

const MATEMATICA = materiaFechada('mat-1', 'Matemática', ['Prova bimestral', 100])
const PORTUGUES = materiaFechada('mat-2', 'Português', ['Dissertação', 100])

function comComponentes(notas = [] as ReturnType<typeof lancamento>[]) {
  return [
    http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
      HttpResponse.json(componentesDoBimestre(String(params.id), [MATEMATICA, PORTUGUES])),
    ),
    ...listagemDeLancamentos(notas),
  ]
}

describe('LancamentosDeComponente', () => {
  it('lista os componentes com a matéria no rótulo, para diferenciar homônimos', async () => {
    server.use(...comComponentes())

    renderComSessao(
      <LancamentosDeComponente
        bimestre={bimestreDoTeste()}
        componenteId="cp-mat-1"
        onComponenteChange={() => {}}
        alunos={[ANA]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // Dois "Prova 1", um de cada matéria, são linhas diferentes: o seletor precisa
    // dizer de qual deles é a nota que está sendo lançada.
    expect(await screen.findByRole('option', { name: 'Matemática — Prova bimestral (100%)' })).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Português — Dissertação (100%)' }),
    ).toBeInTheDocument()
  })

  it('não deixa a nota digitada vazar de um componente para o outro', async () => {
    const pessoa = userEvent.setup()
    server.use(...comComponentes())

    /*
     * A escolha do componente fica num wrapper com estado, como na página: assim
     * o teste troca de componente pelo mesmo seletor que o professor usa, em vez
     * de remontar a árvore e fingir que a troca não mudou nada.
     */
    function Cenario() {
      const [componenteId, setComponenteId] = useState('mat-1-cp1')

      return (
        <LancamentosDeComponente
          bimestre={bimestreDoTeste()}
          componenteId={componenteId}
          onComponenteChange={setComponenteId}
          alunos={[ANA]}
          modelo={MODELO_NUMERICO}
        />
      )
    }

    renderComSessao(<Cenario />)

    await pessoa.type(await screen.findByLabelText('Nota de Ana'), '8')
    expect(screen.getByLabelText('Nota de Ana')).toHaveValue(8)

    await pessoa.selectOptions(
      screen.getByLabelText('Componente de pontuação'),
      'mat-2-cp1',
    )

    // A mesma posição de tela, agora com o componente da outra matéria. Sem a
    // remontagem, o 8 digitado apareceria aqui como se fosse nota da dissertação.
    await waitFor(() => expect(screen.getByLabelText('Nota de Ana')).toHaveValue(null))
  })

  it('avisa que o bimestre não tem componente e manda para a aba certa', async () => {
    server.use(
      http.get(`${API}/bimestres/:id/componentes-pontuacao`, ({ params }) =>
        HttpResponse.json(componentesDoBimestre(String(params.id), [])),
      ),
    )

    renderComSessao(
      <LancamentosDeComponente
        bimestre={bimestreDoTeste()}
        componenteId={undefined}
        onComponenteChange={() => {}}
        alunos={[ANA]}
        modelo={MODELO_NUMERICO}
      />,
    )

    expect(
      await screen.findByText(/Este bimestre ainda não tem componente de pontuação\./),
    ).toBeInTheDocument()
  })

  it('deixa o seletor liberado com o bimestre encerrado, só com as notas travadas', async () => {
    server.use(...comComponentes([lancamento('mat-1-cp1', ANA, '7')]))

    renderComSessao(
      <LancamentosDeComponente
        bimestre={bimestreDoTeste(SITUACAO_BIMESTRE.ENCERRADO)}
        componenteId="mat-1-cp1"
        onComponenteChange={() => {}}
        alunos={[ANA]}
        modelo={MODELO_NUMERICO}
      />,
    )

    // Ler as notas de um bimestre encerrado é justamente o que se faz com ele, e
    // a nota que já estava salva continua visível — só não pode ser mexida.
    expect(await screen.findByLabelText('Componente de pontuação')).toBeEnabled()
    expect(await screen.findByLabelText('Nota de Ana')).toBeDisabled()
    await waitFor(() => expect(screen.getByLabelText('Nota de Ana')).toHaveValue(7))
  })
})
