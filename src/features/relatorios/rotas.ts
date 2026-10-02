/**
 * Rotas dos quatro relatórios da Etapa 10.
 *
 * As quatro espelham os endpoints da API (`README-API.md`, seção 11.13), e não
 * uma rota de relatório com tipo na query: a API separa aluno de grupo no
 * caminho, e a tela precisa saber em qual das duas famílias está só pelo `id` que
 * veio do link — o que também impede que um relatório de aluno seja aberto com
 * o id de um grupo.
 *
 * Aparecem em três lugares que precisam concordar: a tabela de rotas
 * (`src/app/App.tsx`), os atalhos dentro das telas e os links do dashboard do
 * aluno.
 */

export const ROTA_RELATORIO_INDIVIDUAL = '/alunos/:alunoId/relatorio-individual'
export const ROTA_RELATORIO_COMPARATIVO_DO_ALUNO =
  '/alunos/:alunoId/relatorio-comparativo-grupo'
export const ROTA_RELATORIO_DO_GRUPO = '/grupos/:grupoId/relatorio'
export const ROTA_RELATORIO_COMPARATIVO_DO_GRUPO = '/grupos/:grupoId/relatorio-comparativo'

/**
 * Junta a query da competição a um caminho de relatório.
 *
 * O `competicaoId` só vai quando existe, porque a API distingue "sem parâmetro"
 * de "parâmetro vazio" (`ParseUUIDPipe` recusaria string vazia), e o aluno que
 * participa de uma competição só não precisa informar nada.
 */
function comCompeticao(caminho: string, competicaoId?: string): string {
  if (!competicaoId) return caminho
  return `${caminho}?${new URLSearchParams({ competicaoId }).toString()}`
}

/** Relatório individual do aluno, com as matérias de cada bimestre. */
export function rotaDoRelatorioIndividual(alunoId: string, competicaoId?: string): string {
  return comCompeticao(`/alunos/${alunoId}/relatorio-individual`, competicaoId)
}

/** Relatório do aluno comparado aos integrantes do grupo dele, bimestre a bimestre. */
export function rotaDoRelatorioComparativoDoAluno(
  alunoId: string,
  competicaoId?: string,
): string {
  return comCompeticao(`/alunos/${alunoId}/relatorio-comparativo-grupo`, competicaoId)
}

/** Relatório coletivo do grupo. A API descobre a competição pelo grupo. */
export function rotaDoRelatorioDoGrupo(grupoId: string): string {
  return `/grupos/${grupoId}/relatorio`
}

/** Relatório do grupo comparado aos demais grupos da competição. */
export function rotaDoRelatorioComparativoDoGrupo(grupoId: string): string {
  return `/grupos/${grupoId}/relatorio-comparativo`
}