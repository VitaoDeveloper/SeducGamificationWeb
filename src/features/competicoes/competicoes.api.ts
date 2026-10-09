import { api } from '../../lib/api'
import type {
  Bimestre,
  CompeticaoCompleta,
  EditarBimestre,
  EditarCompeticao,
  EditarGrupo,
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

/**
 * `PATCH /competicoes/:id` — renomeia a competição.
 *
 * A resposta é a linha sem os aninhados que `GET` traz, e a tela nem a usa:
 * depois de renomear, ela relê a competição para o cabeçalho e os demais dados
 * virem da mesma fonte.
 */
export async function atualizarCompeticao(
  id: string,
  alteracoes: EditarCompeticao,
): Promise<CompeticaoCompleta> {
  const { data } = await api.patch<CompeticaoCompleta>(`/competicoes/${id}`, alteracoes)
  return data
}

/**
 * `PATCH /bimestres/:id` — corrige as datas de um bimestre.
 *
 * A API só aceita bimestre `ABERTO` e sem componentes de pontuação; numa dessas
 * recusas responde 409 com a explicação, e é ela que a tela mostra — a regra de
 * que a pontuação congela as datas não pertence à interface, e adivinhá-la aqui
 * esconderia o motivo do servidor.
 */
export async function atualizarBimestre(id: string, alteracoes: EditarBimestre): Promise<Bimestre> {
  const { data } = await api.patch<Bimestre>(`/bimestres/${id}`, alteracoes)
  return data
}

/**
 * `DELETE /competicoes/:id` — exclui a competição.
 *
 * A API só exclui competição sem uso — sem bimestre encerrado, pontuação ou
 * grupo com integrante. Cada recusa responde 409 com a explicação, e os três
 * motivos só o servidor sabe distinguir; a tela mostra a mensagem do jeito que
 * veio. O retorno é vazio (a resposta é `204`).
 */
export async function excluirCompeticao(id: string): Promise<void> {
  await api.delete(`/competicoes/${id}`)
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
 * `PATCH /grupos/:id` — renomeia o grupo.
 *
 * O nome é o rótulo da equipe e vale para a competição inteira: não muda com o
 * bimestre, então renomear não mexe em quem está no grupo em cada período.
 */
export async function atualizarGrupo(
  id: string,
  alteracoes: EditarGrupo,
): Promise<GrupoCompetidor> {
  const { data } = await api.patch<GrupoCompetidor>(`/grupos/${id}`, alteracoes)
  return data
}

/**
 * `DELETE /grupos/:id` — exclui o grupo.
 *
 * A API só exclui grupo sem membros em nenhum bimestre; com qualquer integrante
 * responde 409 com a orientação para removê-los um a um, e é essa mensagem que a
 * tela mostra — não há remoção em massa de membros a partir daqui. O retorno é
 * vazio (a resposta é `204`).
 */
export async function excluirGrupo(id: string): Promise<void> {
  await api.delete(`/grupos/${id}`)
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
