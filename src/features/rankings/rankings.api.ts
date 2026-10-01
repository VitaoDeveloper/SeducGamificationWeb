import { AxiosError } from 'axios'

import { api } from '../../lib/api'

import type { RespostaDeRanking, RespostaDoRankingIndividual } from './rankings.tipos'

/**
 * O texto que a tela mostra quando a API recusa a consulta por escopo.
 *
 * A recusa chega como `403` e o corpo traz "Forbidden", que não diz a ninguém o
 * que aconteceu. A mensagem abaixo cobre os dois perfis sem afirmar qual dos
 * dois casos foi: pode ser um ranking de outra sala (o caso do aluno que abriu
 * uma competição que não é a dele) ou um endpoint que o perfil não pode
 * consultar — as duas causas que a API documenta em `README-API.md`, seções 7 e
 * 9. O que importa é que a página continue de pé e diga o que fazer.
 */
export const MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO =
  'Você não tem acesso a este ranking. Ele pode ser de outra sala, ou o seu perfil pode não ter permissão para vê-lo.'

/**
 * Reescreve a mensagem de um `403` da API e devolve `null` nas outras falhas.
 *
 * Consumida como `traduzirErro` em `useRequisicao`: devolver `null` deixa a
 * mensagem padrão (rede, timeout, erro de aplicação) intacta, e só o acesso
 * negado ganha um texto que o leitor entende.
 */
export function traduzirErroDoRanking(falha: unknown): string | null {
  if (falha instanceof AxiosError && falha.response?.status === 403) {
    return MENSAGEM_DE_ACESSO_FORA_DO_ESCOPO
  }

  return null
}

/**
 * `GET /competicoes/:id/ranking?bimestreId=<uuid>`
 *
 * - Sem `bimestreId`: ranking anual (grupos), com pontuação final = soma.
 * - Com `bimestreId`: ranking parcial do bimestre (grupos).
 *
 * Não é assinado no `path` porque a API exige `bimestreId` como query quando
 * parcial, e o omite quando anual — e no axios o `params` com valor `undefined`
 * não envia o parâmetro.
 */
export async function buscarRankingDeGrupos(
  competicaoId: string,
  bimestreId?: string,
): Promise<RespostaDeRanking> {
  const { data } = await api.get<RespostaDeRanking>(`/competicoes/${competicaoId}/ranking`, {
    params: bimestreId ? { bimestreId } : undefined,
  })
  return data
}

/** `GET /competicoes/:id/ranking-individual` — ranking individual anual. */
export async function buscarRankingIndividual(
  competicaoId: string,
): Promise<RespostaDoRankingIndividual> {
  const { data } = await api.get<RespostaDoRankingIndividual>(
    `/competicoes/${competicaoId}/ranking-individual`,
  )
  return data
}
