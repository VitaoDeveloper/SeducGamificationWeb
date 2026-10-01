import { api } from '../../lib/api'
import type { Aluno, EscolaResumo, Lecionamento, NovaSala, NovoAluno, Sala } from './salas.tipos'

/**
 * Chamadas de sala, lecionamento e aluno.
 *
 * Fica em um arquivo só porque as três coisas formam o mesmo recorte de tela —
 * a Etapa 03 é a sala e o que se faz nela — e porque os caminhos se repetem:
 * todas as rotas de aluno e de lecionamento pendem de `/salas/{salaId}`.
 */

/** Salas de todas as escolas em que o professor está vinculado. */
export async function listarSalas(): Promise<Sala[]> {
  const { data } = await api.get<Sala[]>('/salas')
  return data
}

/**
 * Escolas às quais o professor está vinculado, com nome.
 *
 * Sai da tabela de vínculos da API, e não de `GET /salas`: é o vínculo que
 * define o alcance do professor, e deduzir as escolas a partir das salas
 * escondia as escolas sem nenhuma turma — que são exatamente as que o professor
 * precisa escolher para criar a primeira.
 */
export async function listarEscolas(): Promise<EscolaResumo[]> {
  const { data } = await api.get<EscolaResumo[]>('/escolas')
  return data
}

export async function criarSala(nova: NovaSala): Promise<Sala> {
  const { data } = await api.post<Sala>('/salas', nova)
  return data
}

export async function listarLecionamentos(salaId: string): Promise<Lecionamento[]> {
  const { data } = await api.get<Lecionamento[]>(`/salas/${salaId}/lecionamentos`)
  return data
}

/**
 * Inscrição do professor na sala, com os componentes que ele leciona.
 *
 * A API recusa com 409 quando a inscrição já existe, e a mensagem que vem
 * ("Professor já está inscrito nesta sala.") é a que a tela mostra: é mais
 * precisa do que qualquer texto que a interface inventaria aqui.
 */
export async function inscreverNaSala(
  salaId: string,
  componentes: string[],
): Promise<Lecionamento> {
  const { data } = await api.post<Lecionamento>(`/salas/${salaId}/inscricao`, { componentes })
  return data
}

export async function listarAlunos(salaId: string): Promise<Aluno[]> {
  const { data } = await api.get<Aluno[]>(`/salas/${salaId}/alunos`)
  return data
}

/**
 * Cadastra o aluno e devolve o que a API gerou.
 *
 * A senha inicial é o próprio código de matrícula, então a resposta carrega o
 * dado que o professor precisa repassar ao aluno agora, aqui. Por isso a tela
 * não o adivinha nem o compõe: `codigoMatricula` é autogerado, sequencial por
 * ano, e a única cópia que o professor vai ter está nesta tela.
 */
export async function cadastrarAluno(salaId: string, novo: NovoAluno): Promise<Aluno> {
  const { data } = await api.post<Aluno>(`/salas/${salaId}/alunos`, novo)
  return data
}
