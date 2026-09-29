import { api } from '../../lib/api'
import type { Sessao, TipoUsuario } from '../../lib/sessao'

/** Corpo de `GET /auth/me`: o que a API sabe sobre quem está autenticado. */
export interface UsuarioAutenticado {
  id: string
  tipo: TipoUsuario
}

interface RespostaLogin {
  accessToken: string
}

/**
 * Autentica e devolve a sessão completa.
 *
 * São duas chamadas porque o login responde apenas o token: quem é a pessoa — id
 * e perfil — vem do `GET /auth/me`. O token viaja no header da própria
 * requisição, em vez de pelo interceptor, para não precisar gravar uma sessão
 * pela metade entre as duas: se o `/auth/me` falhar, nada fica guardado e o
 * formulário mostra o erro como se nada tivesse acontecido.
 */
export async function autenticar(codigoMatricula: string, senha: string): Promise<Sessao> {
  const { data } = await api.post<RespostaLogin>(
    '/auth/login',
    { codigoMatricula, senha },
    { semSessaoAoExpirar: true },
  )

  const { id, tipo } = await buscarUsuarioAutenticado(data.accessToken)

  return {
    token: data.accessToken,
    // A API não devolve o nome nem o código de matrícula: fica o que foi
    // digitado no formulário, que é o mesmo que a pessoa digitou.
    usuario: { id, tipo, codigoMatricula },
  }
}

async function buscarUsuarioAutenticado(token: string): Promise<UsuarioAutenticado> {
  const { data } = await api.get<UsuarioAutenticado>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
    semSessaoAoExpirar: true,
  })
  return data
}

/**
 * Troca a senha de quem está logado. A API responde 200 sem corpo.
 *
 * O 401 aqui quer dizer "senha atual incorreta", e não "sessão expirada": sem a
 * marcação abaixo, o professor errava a senha atual e era jogado para o login.
 */
export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await api.post(
    '/auth/trocar-senha',
    { senhaAtual, novaSenha },
    { semSessaoAoExpirar: true },
  )
}
