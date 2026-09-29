import { api } from '../../lib/api'
import type {
  CompeticaoCompleta,
  GrupoCompetidor,
  GruposDaCompeticao,
  MembroDoGrupo,
  NovaCompeticao,
} from './competicoes.tipos'

/**
 * Chamadas de competição, bimestre, grupo e membro.
 *
 * Em um arquivo só porque são um recorte de tela só — a Etapa 04 monta a
 * competição, seus bimestres e quem participa de cada grupo — e porque os
 * caminhos se encadeiam: o grupo pende da competição, o membro pende do grupo.
 */

/** `POST /competicoes` — cria a competição com os 4 bimestres de uma vez. */
export async function criarCompeticao(nova: NovaCompeticao): Promise<CompeticaoCompleta> {
  const { data } = await api.post<CompeticaoCompleta>('/competicoes', nova)
  return data
}

/** `GET /competicoes/:id` — a competição, seus bimestres e os grupos (sem membros). */
export async function detalharCompeticao(competicaoId: string): Promise<CompeticaoCompleta> {
  const { data } = await api.get<CompeticaoCompleta>(`/competicoes/${competicaoId}`)
  return data
}

/** `GET /lecionamentos/:id/competicoes` — competições de um lecionamento. */
export async function listarCompeticoesDoLecionamento(
  lecionamentoId: string,
): Promise<CompeticaoCompleta[]> {
  const { data } = await api.get<CompeticaoCompleta[]>(`/lecionamentos/${lecionamentoId}/competicoes`)
  return data
}

export async function criarGrupo(competicaoId: string, nome: string): Promise<GrupoCompetidor> {
  const { data } = await api.post<GrupoCompetidor>(`/competicoes/${competicaoId}/grupos`, { nome })
  return data
}

/**
 * `GET /competicoes/:id/grupos` — grupos com os integrantes do bimestre.
 *
 * Sem `bimestreId`, a API devolve o bimestre aberto mais recente (e responde 400
 * se não houver nenhum aberto). Passar o id sempre que a tela já sabe qual
 * bimestre está vendo evita depender dessa escolha implícita.
 */
export async function listarGrupos(
  competicaoId: string,
  bimestreId?: string,
): Promise<GruposDaCompeticao> {
  const { data } = await api.get<GruposDaCompeticao>(`/competicoes/${competicaoId}/grupos`, {
    params: bimestreId ? { bimestreId } : undefined,
  })
  return data
}

export async function adicionarMembro(
  grupoId: string,
  alunoId: string,
  bimestreId: string,
): Promise<MembroDoGrupo> {
  const { data } = await api.post<MembroDoGrupo>(`/grupos/${grupoId}/membros`, {
    alunoId,
    bimestreId,
  })
  return data
}

/**
 * `DELETE /grupos/:id/membros/:alunoId` — remove o aluno do grupo no bimestre.
 *
 * O `bimestreId` vai por query porque o vínculo é triplo (grupo, aluno,
 * bimestre): sem ele a API não sabe qual dos vínculos apagar.
 */
export async function removerMembro(
  grupoId: string,
  alunoId: string,
  bimestreId: string,
): Promise<void> {
  await api.delete(`/grupos/${grupoId}/membros/${alunoId}`, {
    params: { bimestreId },
  })
}
