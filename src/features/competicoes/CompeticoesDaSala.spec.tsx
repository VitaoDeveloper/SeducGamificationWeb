import { screen } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderComSessao } from '../../test/render'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import {
  API,
  ESCOLA_A,
  PROFESSOR_DE_TESTE,
  TOKEN_DE_TESTE,
  bimestresDaCompeticao,
  competicao,
  lecionamento,
  sala,
  salasDoProfessor,
} from '../../test/handlers'
import { CompeticoesDaSala } from './CompeticoesDaSala'
import { ROTA_SALAS_COMPETICOES } from '../salas/rotas'

const SALA = sala({ id: 'sala-1', nome: '2º DS', escola: ESCOLA_A })

const MEU = lecionamento({ id: 'lec-meu', salaId: SALA.id })

const DE_OUTRO = lecionamento({
  id: 'lec-outro',
  salaId: SALA.id,
  professorId: 'prof-outro',
  professor: { id: 'prof-outro', nome: 'Outra Professora', codigoMatricula: '26002' },
})

const MINHA_COMPETICAO = competicao({
  id: 'c1',
  nome: 'Copa de Programação Web',
  lecionamentoId: MEU.id,
  bimestres: bimestresDaCompeticao('c1'),
})

function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: {
      id: PROFESSOR_DE_TESTE,
      tipo: TIPO_USUARIO.PROFESSOR,
      codigoMatricula: '26001',
    },
  })
}

function cenario() {
  return [
    ...salasDoProfessor([SALA], { [SALA.id]: [MEU, DE_OUTRO] }),
    http.get(`${API}/lecionamentos/:id/competicoes`, ({ params }) =>
      HttpResponse.json(params.id === MEU.id ? [MINHA_COMPETICAO] : []),
    ),
  ]
}

function renderizar() {
  return renderComSessao(
    <Routes>
      <Route path={ROTA_SALAS_COMPETICOES} element={<CompeticoesDaSala />} />
    </Routes>,
    `/salas/${SALA.id}/competicoes`,
  )
}

describe('CompeticoesDaSala', () => {
  it('lista as competições por professor, com o botão só no lecionamento do professor logado', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizar()

    expect(
      await screen.findByRole('heading', { name: 'Professor Exemplo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outra Professora' })).toBeInTheDocument()

    expect(await screen.findByText('Copa de Programação Web')).toBeInTheDocument()
    expect(
      screen.getByText('Nenhuma competição deste professor nesta sala ainda.'),
    ).toBeInTheDocument()

    // Só o lecionamento do professor logado oferece criar uma competição.
    expect(screen.getAllByRole('button', { name: /nova competição/i })).toHaveLength(1)
  })

  it('oferece o caminho de volta pelas abas da sala', async () => {
    server.use(...cenario())
    abrirSessao()

    renderizar()

    const abas = await screen.findByRole('navigation', { name: /seções da sala/i })
    expect(abas).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Lecionamentos' })).toHaveAttribute(
      'href',
      `/salas/${SALA.id}`,
    )
  })
})
