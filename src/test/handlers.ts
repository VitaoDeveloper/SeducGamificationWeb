import { http, HttpResponse } from 'msw'
import { TIPO_USUARIO } from '../lib/sessao'
import type { TipoUsuario } from '../lib/sessao'
import type { Aluno, EscolaResumo, Lecionamento, Sala } from '../features/salas'

/**
 * Handlers de autenticação para os testes, em forma de fábrica.
 *
 * Ficam aqui, e não prontos no `server.ts`, porque o que muda entre os testes é
 * justamente o cenário: a `LoginPage` monta o caso do aluno, o `AuthProvider` o
 * da senha recusada. Um handler único compartilhado teria de adivinhar, no
 * momento do `server.use`, o que cada tela precisa — e o teste passaria a
 * descrever o mock, não o código.
 *
 * Cada função devolve os handlers que o teste espalha no seu próprio
 * `server.use(...)`, e o `resetHandlers` de `src/test/setup.ts` desfaz tudo
 * depois.
 *
 * Os de sala estão no fim do arquivo pelo mesmo motivo, e porque as respostas
 * de `GET /salas` e `GET /salas/:id/lecionamentos` andam sempre juntas: a
 * listagem junta as duas para saber onde o professor leciona.
 */

export const API = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

/** Senha que os handlers de login aceitam; qualquer outra é recusada com 401. */
export const SENHA_DE_TESTE = 'senha-correta'

export const TOKEN_DE_TESTE = 'token-de-teste'

/** Id do professor da sessão nos testes de sala. */
export const PROFESSOR_DE_TESTE = 'prof-1'

/**
 * Corpo de erro no formato do NestJS, que é o que `mensagemDeErro` em
 * `src/lib/erro-api.ts` sabe ler.
 */
function erroDaApi(status: number, message: string) {
  return { statusCode: status, message, error: status === 401 ? 'Unauthorized' : 'Bad Request' }
}

/**
 * Login aceito, com o `GET /auth/me` que vem logo atrás.
 *
 * Os dois vêm juntos porque `autenticar` em `auth.api.ts` faz as duas chamadas e
 * só grava a sessão se as duas derem certo: um teste do login que devolvesse só
 * o token deixaria o `AuthProvider` sem usuário para testar.
 *
 * A senha é conferida aqui para que o cenário de recusa saia do próprio handler,
 * sem um segundo `server.use` disputando com este.
 */
export function loginAceito(
  opcoes: { tipo?: TipoUsuario; id?: string } = {},
): [ReturnType<typeof http.post>, ReturnType<typeof http.get>] {
  const { tipo = TIPO_USUARIO.PROFESSOR, id = 'prof-1' } = opcoes

  return [
    http.post(`${API}/auth/login`, async ({ request }) => {
      const { senha } = (await request.json()) as { senha?: string }

      if (senha !== SENHA_DE_TESTE) {
        return HttpResponse.json(erroDaApi(401, 'Código de matrícula ou senha inválidos.'), {
          status: 401,
        })
      }

      return HttpResponse.json({ accessToken: TOKEN_DE_TESTE })
    }),
    http.get(`${API}/auth/me`, () => HttpResponse.json({ id, tipo })),
  ]
}

/** Login recusado, sem o `/auth/me`: a sessão nem chega a ser montada. */
export function loginRecusado() {
  return http.post(`${API}/auth/login`, () =>
    HttpResponse.json(erroDaApi(401, 'Código de matrícula ou senha inválidos.'), { status: 401 }),
  )
}

export function trocarSenhaAceita() {
  return http.post(`${API}/auth/trocar-senha`, () => new HttpResponse(null, { status: 200 }))
}

/**
 * Senha atual errada. A API responde 401, o mesmo código do token expirado, e
 * é essa ambiguidade que o `semSessaoAoExpirar` desarma.
 */
export function trocarSenhaRecusada() {
  return http.post(`${API}/auth/trocar-senha`, () =>
    HttpResponse.json(erroDaApi(401, 'Senha atual incorreta.'), { status: 401 }),
  )
}

/* ------------------------------------------------------------------ salas -- */

export const ESCOLA_A: EscolaResumo = { id: 'escola-a', nome: 'Escola Estadual de Exemplo' }
export const ESCOLA_B: EscolaResumo = { id: 'escola-b', nome: 'Escola Técnica Dutra' }

/** Sala pronta, com a escola já embutida como a API devolve. */
export function sala(
  parcial: Partial<Sala> & Pick<Sala, 'id' | 'nome'>,
): Sala {
  const { id, nome } = parcial
  return {
    anoLetivo: 2026,
    escolaId: ESCOLA_A.id,
    professorCriadorId: PROFESSOR_DE_TESTE,
    escola: ESCOLA_A,
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    ...parcial,
    id,
    nome,
  }
}

export function lecionamento(
  parcial: Partial<Lecionamento> & Pick<Lecionamento, 'id' | 'salaId'>,
): Lecionamento {
  return {
    professorId: PROFESSOR_DE_TESTE,
    professor: { id: PROFESSOR_DE_TESTE, nome: 'Professor Exemplo', codigoMatricula: '26001' },
    componentesCurriculares: [
      { id: `${parcial.id}-c1`, lecionamentoId: parcial.id, nome: 'Programação Web' },
    ],
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    ...parcial,
  }
}

export function aluno(parcial: Partial<Aluno> & Pick<Aluno, 'id' | 'nome' | 'codigoMatricula'>): Aluno {
  return { createdAt: '2026-03-01T12:00:00.000Z', ...parcial }
}

/**
 * Salas do professor, com os lecionamentos de cada uma.
 *
 * As duas respostas saem juntas porque a tela as pede juntas: a listagem precisa
 * saber, para cada sala, se o professor leciona nela, e quem responde isso é o
 * endpoint de lecionamentos. Deixar as duas de fora do mesmo conjunto faria o
 * `onUnhandledRequest: 'error'` do msw acusar a tela inteira.
 */
export function salasDoProfessor(
  salas: Sala[],
  lecionamentosPorSala: Record<string, Lecionamento[]> = {},
) {
  return [
    http.get(`${API}/salas`, () => HttpResponse.json(salas)),
    http.get(`${API}/salas/:salaId/lecionamentos`, ({ params }) =>
      HttpResponse.json(lecionamentosPorSala[String(params.salaId)] ?? []),
    ),
  ]
}

/** Nenhuma sala: a resposta vazia do `GET /salas` mais os lecionamentos em branco. */
export function semSalas() {
  return salasDoProfessor([])
}
