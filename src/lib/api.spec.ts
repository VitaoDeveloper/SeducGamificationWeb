import { HttpResponse, http } from 'msw'
import { vi } from 'vitest'
import { API, TOKEN_DE_TESTE } from '../test/handlers'
import { server } from '../test/server'
import { gravarSessao, inscrever, lerToken, lerUsuario, TIPO_USUARIO } from './sessao'
import { api } from './api'

/*
 * A sessão viva, ou seja, o que a pessoa autenticada leva para a API. O que o
 * interceptor faz com ela em cada resposta é o assunto deste arquivo.
 */
function abrirSessao() {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: { id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
  })
}

describe('interceptor do axios', () => {
  it('anexa o header Authorization quando há token', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${API}/auth/me`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR })
      }),
    )
    abrirSessao()

    await api.get('/auth/me')

    expect(authorization).toBe(`Bearer ${TOKEN_DE_TESTE}`)
  })

  it('não manda o header quando não há token', async () => {
    let authorization: string | null = 'não inspecionado'
    server.use(
      http.get(`${API}/auth/me`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR })
      }),
    )

    await api.get('/auth/me')

    expect(authorization).toBeNull()
  })

  it('encerra a sessão e avisa o provider quando a resposta é 401', async () => {
    server.use(http.get(`${API}/salas`, () => new HttpResponse(null, { status: 401 })))
    abrirSessao()
    const avisado = vi.fn()
    inscrever(avisado)

    await expect(api.get('/salas')).rejects.toThrow()

    // O `AuthProvider` assina a guarda, e é o aviso que o faz cair para `null` e
    // o `ProtectedRoute` redirecionar. Sem ele, a sessão sumiria da tela sem
    // ninguém ser avisado.
    expect(avisado).toHaveBeenCalledTimes(1)
    expect(lerToken()).toBeNull()
    expect(lerUsuario()).toBeNull()
    expect(localStorage.getItem('seduc-gamification:token')).toBeNull()
  })

  it('mantém a sessão num 401 de chamada marcada com semSessaoAoExpirar', async () => {
    server.use(http.get(`${API}/auth/me`, () => new HttpResponse(null, { status: 401 })))
    abrirSessao()
    const avisado = vi.fn()
    inscrever(avisado)

    /*
     * A API usa 401 tanto para token expirado quanto para credencial recusada no
     * corpo da requisição. A marcação é o que separa os dois: sem ela, errar a
     * senha atual na troca expulsaria o professor da sessão.
     */
    await expect(api.get('/auth/me', { semSessaoAoExpirar: true })).rejects.toThrow()

    expect(avisado).not.toHaveBeenCalled()
    expect(lerToken()).toBe(TOKEN_DE_TESTE)
    expect(lerUsuario()?.codigoMatricula).toBe('26001')
  })
})
