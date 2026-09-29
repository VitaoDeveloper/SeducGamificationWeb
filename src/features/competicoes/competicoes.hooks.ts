import { useRequisicao } from '../../lib/useRequisicao'
import { listarLecionamentos, listarSalas } from '../salas/salas.api'
import type { Lecionamento, Sala } from '../salas/salas.tipos'
import {
  detalharCompeticao,
  listarCompeticoesDoLecionamento,
  listarGrupos,
} from './competicoes.api'
import type { CompeticaoCompleta, GruposDaCompeticao } from './competicoes.tipos'

/**
 * Competições de um lecionamento, em ordem de criação.
 *
 * É o que a aba "Competições" mostra por professor: um lecionamento pode ter
 * várias competições ao longo do ano, e a API as devolve já ordenadas.
 */
export function useCompeticoesDoLecionamento(lecionamentoId: string | undefined) {
  return useRequisicao<CompeticaoCompleta[]>(
    () => (lecionamentoId ? listarCompeticoesDoLecionamento(lecionamentoId) : Promise.resolve([])),
    `competicoes-do-lecionamento:${lecionamentoId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar as competições.' },
  )
}

/** Uma competição pelo id, com bimestres e grupos (sem membros). */
export function useCompeticao(competicaoId: string | undefined) {
  return useRequisicao<CompeticaoCompleta | null>(
    () => (competicaoId ? detalharCompeticao(competicaoId) : Promise.resolve(null)),
    `competicao:${competicaoId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar a competição.' },
  )
}

/**
 * Grupos da competição com os integrantes de um bimestre.
 *
 * A `chave` inclui o `bimestreId` porque é ele que muda a resposta: trocar o
 * seletor precisa disparar uma busca nova. O `bimestreId` é opcional de
 * propósito — sem ele a API escolhe o bimestre aberto mais recente, e é essa
 * escolha que a tela usa como padrão na primeira carga.
 */
export function useGrupos(competicaoId: string | undefined, bimestreId: string | undefined) {
  return useRequisicao<GruposDaCompeticao | null>(
    () => (competicaoId ? listarGrupos(competicaoId, bimestreId) : Promise.resolve(null)),
    `grupos:${competicaoId ?? ''}:${bimestreId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar os grupos.' },
  )
}

export interface CompeticoesDoLecionamento {
  lecionamento: Lecionamento
  competicoes: CompeticaoCompleta[]
}

/**
 * Competições de todos os lecionamentos de uma sala, agrupadas por professor.
 *
 * A aba precisa mostrar a sala inteira, e não só o que o professor logado
 * leciona: ele vê as competições dos colegas (em modo leitura) e só cria nas
 * suas. Por isso os lecionamentos vêm primeiro e as competições pendem de cada
 * um — e a falha em um lecionamento não derruba os demais, que continuam
 * listáveis.
 */
export function useCompeticoesDaSala(salaId: string | undefined) {
  return useRequisicao<CompeticoesDoLecionamento[]>(
    async () => {
      if (!salaId) return []

      const lecionamentos = await listarLecionamentos(salaId)

      return Promise.all(
        lecionamentos.map(async (lecionamento) => ({
          lecionamento,
          competicoes: await listarCompeticoesDoLecionamento(lecionamento.id).catch(
            () => [] as CompeticaoCompleta[],
          ),
        })),
      )
    },
    `competicoes-da-sala:${salaId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar as competições da sala.' },
  )
}

/**
 * A sala a que um lecionamento pertence.
 *
 * O detalhe da competição conhece só o `lecionamentoId`, mas a lista de alunos
 * (para compor os grupos) é por sala. Não há `GET /lecionamentos/:id` nem
 * `GET /salas/:id`, então a sala é procurada nas salas do professor: são poucas,
 * e o lecionamento é comparado dentro de cada uma.
 */
export function useSalaDoLecionamento(lecionamentoId: string | undefined) {
  return useRequisicao<Sala | null>(
    async () => {
      if (!lecionamentoId) return null

      const salas = await listarSalas()

      for (const sala of salas) {
        const lecionamentos = await listarLecionamentos(sala.id).catch(() => [] as Lecionamento[])
        if (lecionamentos.some((lecionamento) => lecionamento.id === lecionamentoId)) {
          return sala
        }
      }

      return null
    },
    `sala-do-lecionamento:${lecionamentoId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar a sala da competição.' },
  )
}
