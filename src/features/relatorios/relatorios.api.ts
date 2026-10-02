import { AxiosError } from 'axios'

import { api } from '../../lib/api'

import type {
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
  RelatorioDoGrupo,
  RelatorioIndividual,
} from './relatorios.tipos'

/**
 * O texto que a tela mostra quando a API recusa um relatório por escopo.
 *
 * A recusa chega como `403` e o corpo traz "Forbidden" (ou o motivo interno do
 * `RelatoriosService`, como "Aluno só pode acessar o próprio relatório"), que
 * não diz a quem lê o que fazer. As três causas que a API documenta na seção
 * 11.13 — aluno pedindo o relatório de outro, grupo de outra competição,
 * professor de outra sala — cabem numa frase só, sem afirmar qual foi: a página
 * continua de pé e o texto diz o que a pessoa pode tentar.
 *
 * O mesmo tratamento do `rankings.api.ts`, e pela mesma razão: é o `403` que
 * chega quando o link veio de outro lugar, e a tela não pode quebrar nele.
 */
export const MENSAGEM_DE_ACESSO_AO_RELATORIO =
  'Você não tem acesso a este relatório. Ele pode ser de outra competição, ou o seu perfil pode não ter permissão para vê-lo.'

/**
 * Reescreve a mensagem de um `403` da API e devolve `null` nas outras falhas.
 *
 * Consumida como `traduzirErro` em `useRequisicao`: `null` mantém a mensagem
 * padrão (rede, timeout, erro de aplicação), e só a recusa de escopo ganha texto
 * que o leitor entende.
 */
export function traduzirErroDoRelatorio(falha: unknown): string | null {
  if (falha instanceof AxiosError && falha.response?.status === 403) {
    return MENSAGEM_DE_ACESSO_AO_RELATORIO
  }

  return null
}

/**
 * `GET /alunos/:id/relatorio-individual?competicaoId=<uuid>`
 *
 * O `competicaoId` é opcional na API (só obrigatório quando o aluno participa de
 * mais de uma competição), e chega omitido quando a tela não o tem — no `params`
 * do axios, `undefined` não vira query string.
 */
export async function buscarRelatorioIndividual(
  alunoId: string | undefined,
  competicaoId?: string,
): Promise<RelatorioIndividual | null> {
  if (!alunoId) return null

  const { data } = await api.get<RelatorioIndividual>(`/alunos/${alunoId}/relatorio-individual`, {
    params: competicaoId ? { competicaoId } : undefined,
  })
  return data
}

/** `GET /alunos/:id/relatorio-comparativo-grupo?competicaoId=<uuid>`. */
export async function buscarRelatorioComparativoDoAluno(
  alunoId: string | undefined,
  competicaoId?: string,
): Promise<RelatorioComparativoDoAluno | null> {
  if (!alunoId) return null

  const { data } = await api.get<RelatorioComparativoDoAluno>(
    `/alunos/${alunoId}/relatorio-comparativo-grupo`,
    { params: competicaoId ? { competicaoId } : undefined },
  )
  return data
}

/**
 * `GET /grupos/:id/relatorio`
 *
 * Sem `competicaoId`: a API descobre a competição pelo próprio grupo (é o
 * `carregarAcessoGrupo` que resolve), e mandar o parâmetro seria inventar um
 * filtro que a rota não tem.
 */
export async function buscarRelatorioDoGrupo(
  grupoId: string | undefined,
): Promise<RelatorioDoGrupo | null> {
  if (!grupoId) return null

  const { data } = await api.get<RelatorioDoGrupo>(`/grupos/${grupoId}/relatorio`)
  return data
}

/** `GET /grupos/:id/relatorio-comparativo` — o mesmo grupo, contra os outros. */
export async function buscarRelatorioComparativoDoGrupo(
  grupoId: string | undefined,
): Promise<RelatorioComparativoDoGrupo | null> {
  if (!grupoId) return null

  const { data } = await api.get<RelatorioComparativoDoGrupo>(
    `/grupos/${grupoId}/relatorio-comparativo`,
  )
  return data
}