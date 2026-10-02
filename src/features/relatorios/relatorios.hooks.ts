import { useRequisicao } from '../../lib/useRequisicao'

import {
  buscarRelatorioComparativoDoAluno,
  buscarRelatorioComparativoDoGrupo,
  buscarRelatorioDoGrupo,
  buscarRelatorioIndividual,
  traduzirErroDoRelatorio,
} from './relatorios.api'
import type {
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
  RelatorioDoGrupo,
  RelatorioIndividual,
} from './relatorios.tipos'

/**
 * As quatro buscas dos relatórios.
 *
 * Todas passam pelo mesmo tradutor de erro, porque todas compartilham a mesma
 * recusa possível: o `403` que a API devolve quando quem pede está fora do
 * escopo do recurso (aluno no relatório de outro, grupo de outra competição).
 *
 * Nenhuma delas busca sem id — quem não tem `alunoId`/`grupoId` na rota resolve
 * `null` e não chama a API. É o que permite a página do aluno montar o bloco de
 * relatórios sem buscar nada quando ainda não sabe de quem é o relatório, e o que
 * deixa o teste afirmar a ausência da requisição pelo `onUnhandledRequest: 'error'`
 * do msw.
 */
export function useRelatorioIndividual(alunoId: string | undefined, competicaoId?: string) {
  return useRequisicao<RelatorioIndividual | null>(
    () => buscarRelatorioIndividual(alunoId, competicaoId),
    `relatorio-individual:${alunoId ?? ''}:${competicaoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível carregar o relatório do aluno.',
      traduzirErro: traduzirErroDoRelatorio,
    },
  )
}

export function useRelatorioComparativoDoAluno(
  alunoId: string | undefined,
  competicaoId?: string,
) {
  return useRequisicao<RelatorioComparativoDoAluno | null>(
    () => buscarRelatorioComparativoDoAluno(alunoId, competicaoId),
    `relatorio-comparativo-aluno:${alunoId ?? ''}:${competicaoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível comparar o aluno com o grupo dele.',
      traduzirErro: traduzirErroDoRelatorio,
    },
  )
}

export function useRelatorioDoGrupo(grupoId: string | undefined) {
  return useRequisicao<RelatorioDoGrupo | null>(
    () => buscarRelatorioDoGrupo(grupoId),
    `relatorio-grupo:${grupoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível carregar o relatório do grupo.',
      traduzirErro: traduzirErroDoRelatorio,
    },
  )
}

export function useRelatorioComparativoDoGrupo(grupoId: string | undefined) {
  return useRequisicao<RelatorioComparativoDoGrupo | null>(
    () => buscarRelatorioComparativoDoGrupo(grupoId),
    `relatorio-comparativo-grupo:${grupoId ?? ''}`,
    {
      erroPadrao: 'Não foi possível comparar o grupo com os outros.',
      traduzirErro: traduzirErroDoRelatorio,
    },
  )
}