import { AxiosError } from 'axios'
import { api } from '../../lib/api'

import type {
  CorpoDoDesempate,
  PendenciaDeDesempate,
  RespostaDoDesempate,
  RespostaDoDesempateAutomatico,
} from './desempate.tipos'

/**
 * As três chamadas da Etapa 09.
 *
 * Ficam juntas num arquivo só, e não um por endpoint, porque elas são três faces
 * do mesmo dado — a mesma lista de empates de um escopo, lida, resolvida pelo
 * professor ou resolvida pela regra. O que muda entre elas é quem decide a
 * ordem, e não o formato: as duas escritas devolvem as posições gravadas, para
 * que a tela possa confirmar o que a API gravou em vez de supor que gravou.
 */

/**
 * `GET /competicoes/:id/desempate/pendencias` — os empates que ainda não foram
 * resolvidos, em qualquer escopo.
 *
 * Lista vazia é a resposta normal da maioria da competição, e por isso a tela não
 * trata "sem pendências" como erro: é o estado em que o desempate está em dia.
 */
export async function listarPendenciasDeDesempate(
  competicaoId: string,
): Promise<PendenciaDeDesempate[]> {
  const { data } = await api.get<PendenciaDeDesempate[]>(
    `/competicoes/${competicaoId}/desempate/pendencias`,
  )
  return data
}

/**
 * `POST /competicoes/:id/desempate` — desempate manual (RN24).
 *
 * A ordem precisa formar exatamente um empate do escopo, sem repetir grupo nem
 * posição. A chamada não engole o erro: as três recusas da API são recusas de
 * conteúdo (a ordem escolhida não fecha), e quem decide o que oferecer ao
 * professor é o componente de tela, que sabe o que ele escolheu.
 */
export async function resolverDesempate(
  competicaoId: string,
  corpo: CorpoDoDesempate,
): Promise<RespostaDoDesempate> {
  const { data } = await api.post<RespostaDoDesempate>(
    `/competicoes/${competicaoId}/desempate`,
    corpo,
  )
  return data
}

/**
 * `POST /competicoes/:id/desempate/aplicar-automatico?bimestreId=` — dispara o
 * critério automático (RN25/RN26).
 *
 * O `bimestreId` vai na query e não no corpo porque é ele que define o escopo
 * do que vai ser reordenado; `undefined` (que o axios não serializa) é o anual.
 *
 * No alpha da API isto não é um job: não existe encerramento automático por
 * data, e este endpoint é o substituto manual dele. Por isso a tela trata a
 * chamada como uma ação do professor — com confirmação e com o aviso do que ela
 * simula — e não como um detalhe de sistema.
 */
export async function aplicarCriterioAutomatico(
  competicaoId: string,
  bimestreId?: string,
): Promise<RespostaDoDesempateAutomatico> {
  const { data } = await api.post<RespostaDoDesempateAutomatico>(
    `/competicoes/${competicaoId}/desempate/aplicar-automatico`,
    undefined,
    { params: bimestreId ? { bimestreId } : undefined },
  )
  return data
}

/**
 * A mensagem que a tela mostra quando o desempate é recusado.
 *
 * Só o `403` é reescrito. As recusas de conteúdo (`BadRequestException` em
 * `DesempateService`) já chegam em português e dizem exatamente o que fazer — "a
 * ordem não pode repetir o mesmo grupo mais de uma vez", "os grupos informados
 * não formam exatamente um empate desse ranking" — e repassar isso seria jogar
 * fora a parte mais útil da resposta. O que precisa de tradução é o acesso
 * negado: a API responde o `Forbidden` cru do NestJS, que não diz a ninguém se
 * o problema é o perfil ou o escopo da competição.
 */
export function traduzirErroDoDesempate(falha: unknown): string | null {
  if (falha instanceof AxiosError && falha.response?.status === 403) {
    return 'Você não tem acesso ao desempate desta competição. Só o professor responsável por ela pode resolver os empates.'
  }

  return null
}