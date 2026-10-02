import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { API, aluno, grupo, membro } from '../../test/handlers'
import type { GrupoComMembros } from './competicoes.tipos'
import { GerenciarMembros } from './GerenciarMembros'

const ANA = aluno({ id: 'a1', nome: 'Ana', codigoMatricula: '26010' })
const BIA = aluno({ id: 'a2', nome: 'Bia', codigoMatricula: '26011' })

const GRUPO_A = grupo({ id: 'g1', nome: 'Alpha', competicaoId: 'comp-1' })
const GRUPO_B = grupo({ id: 'g2', nome: 'Beta', competicaoId: 'comp-1' })

function comMembros(grupoBase: typeof GRUPO_A, membros: ReturnType<typeof membro>[]): GrupoComMembros {
  return { ...grupoBase, membrosGrupos: membros }
}

describe('GerenciarMembros', () => {
  it('trava os selects e explica quando o bimestre está encerrado', () => {
    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado
        grupos={[comMembros(GRUPO_A, [membro('g1', ANA, 'b1')])]}
        alunos={[ANA, BIA]}
        onAlterado={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Grupo de Ana')).toBeDisabled()
    expect(screen.getByLabelText('Grupo de Bia')).toBeDisabled()
    expect(
      screen.getByText(/Este bimestre está encerrado\. A composição dos grupos fica só de/),
    ).toBeInTheDocument()
  })

  it('move o aluno de grupo removendo do antigo antes de adicionar no novo', async () => {
    const pessoa = userEvent.setup()
    const chamadas: string[] = []
    const onAlterado = vi.fn()

    server.use(
      http.delete(`${API}/grupos/:grupoId/membros/:alunoId`, ({ params }) => {
        chamadas.push(`DELETE:${params.grupoId}`)
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/grupos/:grupoId/membros`, ({ params }) => {
        chamadas.push(`POST:${params.grupoId}`)
        return HttpResponse.json(membro(String(params.grupoId), ANA, 'b1'), { status: 201 })
      }),
    )

    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado={false}
        grupos={[comMembros(GRUPO_A, [membro('g1', ANA, 'b1')]), comMembros(GRUPO_B, [])]}
        alunos={[ANA, BIA]}
        onAlterado={onAlterado}
      />,
    )

    const selectDaAna = screen.getByLabelText('Grupo de Ana')
    // Um único vínculo: o select já mostra o grupo atual, então não há como
    // colocar a mesma aluna em dois grupos — só movê-la.
    expect(selectDaAna).toHaveValue('g1')

    await pessoa.selectOptions(selectDaAna, 'g2')

    await waitFor(() => expect(onAlterado).toHaveBeenCalledTimes(1))
    expect(chamadas).toEqual(['DELETE:g1', 'POST:g2'])
  })

  it('adiciona ao grupo sem remover quando o aluno ainda não tem grupo', async () => {
    const pessoa = userEvent.setup()
    const chamadas: string[] = []
    const onAlterado = vi.fn()

    server.use(
      http.delete(`${API}/grupos/:grupoId/membros/:alunoId`, () => {
        chamadas.push('DELETE')
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/grupos/:grupoId/membros`, ({ params }) => {
        chamadas.push(`POST:${params.grupoId}`)
        return HttpResponse.json(membro(String(params.grupoId), ANA, 'b1'), { status: 201 })
      }),
    )

    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado={false}
        grupos={[comMembros(GRUPO_A, []), comMembros(GRUPO_B, [])]}
        alunos={[ANA]}
        onAlterado={onAlterado}
      />,
    )

    expect(screen.getByLabelText('Grupo de Ana')).toHaveValue('')

    await pessoa.selectOptions(screen.getByLabelText('Grupo de Ana'), 'g2')

    await waitFor(() => expect(onAlterado).toHaveBeenCalledTimes(1))
    expect(chamadas).toEqual(['POST:g2'])
  })

  it('oferece o relatório individual na terceira coluna, com a competição', () => {
    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado={false}
        grupos={[comMembros(GRUPO_A, [membro('g1', ANA, 'b1')])]}
        alunos={[ANA, BIA]}
        competicaoId="comp-1"
        onAlterado={vi.fn()}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Relatório' })).toBeInTheDocument()
    /*
     * O atalho responde o ano inteiro, e é por isso que ele fica na composição, e
     * não no grupo: o nome do aluno é o que o professor tem na tela. A competição
     * vai na query porque a API só a exige quando o aluno está em mais de uma.
     */
    expect(screen.getAllByRole('link', { name: 'Ver relatório' })[0]).toHaveAttribute(
      'href',
      '/alunos/a1/relatorio-individual?competicaoId=comp-1',
    )
  })

  it('omite a coluna de relatório quando a tela não sabe a competição', () => {
    /*
     * Sem `competicaoId`, a coluna inteira some. Um atalho para um relatório que a
     * API recusaria com `400` seria pior do que nenhum atalho: o professor
     * descobriria o problema só depois de clicar.
     */
    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado={false}
        grupos={[comMembros(GRUPO_A, [membro('g1', ANA, 'b1')])]}
        alunos={[ANA]}
        onAlterado={vi.fn()}
      />,
    )

    expect(screen.queryByRole('columnheader', { name: 'Relatório' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('mostra o erro da API e devolve o aluno ao grupo antigo quando o novo vínculo falha', async () => {
    const pessoa = userEvent.setup()
    const chamadas: string[] = []
    const onAlterado = vi.fn()

    server.use(
      http.delete(`${API}/grupos/:grupoId/membros/:alunoId`, ({ params }) => {
        chamadas.push(`DELETE:${params.grupoId}`)
        return new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/grupos/:grupoId/membros`, ({ params }) => {
        chamadas.push(`POST:${params.grupoId}`)
        // O grupo novo recusa o vínculo; a volta para o antigo é aceita.
        if (params.grupoId === 'g2') {
          return HttpResponse.json(
            { statusCode: 409, message: 'Aluno já pertence a um grupo neste bimestre.' },
            { status: 409 },
          )
        }
        return HttpResponse.json(membro(String(params.grupoId), ANA, 'b1'), { status: 201 })
      }),
    )

    renderComSessao(
      <GerenciarMembros
        bimestreId="b1"
        encerrado={false}
        grupos={[comMembros(GRUPO_A, [membro('g1', ANA, 'b1')]), comMembros(GRUPO_B, [])]}
        alunos={[ANA]}
        onAlterado={onAlterado}
      />,
    )

    await pessoa.selectOptions(screen.getByLabelText('Grupo de Ana'), 'g2')

    expect(
      await screen.findByText('Aluno já pertence a um grupo neste bimestre.'),
    ).toBeInTheDocument()
    expect(onAlterado).not.toHaveBeenCalled()
    // Removeu do antigo, tentou o novo e devolveu ao antigo para não deixar a
    // aluna sem grupo nenhum.
    expect(chamadas).toEqual(['DELETE:g1', 'POST:g2', 'POST:g1'])
  })
})
