import { useMemo } from 'react'
import { useAuth } from '../auth'
import { useRequisicao } from '../../lib/useRequisicao'
import { listarAlunos, listarLecionamentos, listarSalas } from './salas.api'
import type { Aluno, GrupoDeSalas, Lecionamento, Sala } from './salas.tipos'

/**
 * Sala com a resposta à única pergunta que a listagem faz: o professor já
 * leciona aqui?
 *
 * A pergunta é da tela, e `GET /salas` não a responde: a lista vem com a escola
 * de cada turma, e dizer quem está inscrito é o que o detalhe da sala faz. Por
 * isso a listagem junta as duas respostas — são as salas do próprio professor,
 * uma dezena, e o custo é uma chamada a mais por turma.
 */
export interface SalaDoProfessor extends Sala {
  /** Lecionamento do professor da sessão nesta sala, se houver. */
  meuLecionamento: Lecionamento | null
}

/**
 * Salas do professor, com o lecionamento dele em cada uma.
 *
 * Uma falha ao ler os lecionamentos de uma sala não derruba a listagem: a
 * turma continua aparecendo, sem a marca de "você leciona aqui". Pior que
 * esconder a sala inteira, que é o que a pessoa veio buscar.
 */
export function useSalasDoProfessor() {
  const { usuario } = useAuth()
  const meuId = usuario?.id

  return useRequisicao<SalaDoProfessor[]>(async () => {
    const salas = await listarSalas()

    const lecionamentos = await Promise.all(
      salas.map((sala) => listarLecionamentos(sala.id).catch(() => [] as Lecionamento[])),
    )

    return salas.map((sala, indice) => ({
      ...sala,
      meuLecionamento:
        lecionamentos[indice]?.find((lecionamento) => lecionamento.professorId === meuId) ?? null,
    }))
  }, 'salas', { erroPadrao: 'Não foi possível carregar as salas.' })
}

/**
 * As mesmas salas, agrupadas por escola.
 *
 * A ordem dentro do grupo é a da API (ano letivo decrescente, depois nome), e as
 * escolas ficam na ordem da primeira aparição — reordenar alfabeticamente as
 * escolas brigaria com a ordem das turmas que o professor reconhece.
 */
export function useSalasAgrupadasPorEscola() {
  const requisicao = useSalasDoProfessor()

  const grupos = useMemo<GrupoDeSalas<SalaDoProfessor>[]>(() => {
    const porEscola = new Map<string, GrupoDeSalas<SalaDoProfessor>>()

    for (const sala of requisicao.dados ?? []) {
      const existente = porEscola.get(sala.escola.id)
      if (existente) {
        existente.salas.push(sala)
      } else {
        porEscola.set(sala.escola.id, { escola: sala.escola, salas: [sala] })
      }
    }

    return [...porEscola.values()]
  }, [requisicao.dados])

  return { ...requisicao, grupos }
}

/**
 * Uma sala pelo id.
 *
 * Não existe `GET /salas/:id` na API, então a sala é procurada na listagem — que
 * o professor acabou de ver e que é pequena. Só o `id` da rota muda a busca; o
 * resto da linha já veio junto.
 */
export function useSala(salaId: string | undefined) {
  const { usuario } = useAuth()
  const meuId = usuario?.id

  return useRequisicao<SalaDoProfessor | null>(async () => {
    if (!salaId) return null

    const salas = await listarSalas()
    const sala = salas.find((item) => item.id === salaId)
    if (!sala) return null

    return {
      ...sala,
      meuLecionamento:
        (await listarLecionamentos(sala.id)).find(
          (lecionamento) => lecionamento.professorId === meuId,
        ) ?? null,
    }
  }, `sala:${salaId ?? ''}`, { erroPadrao: 'Não foi possível carregar a sala.' })
}

export function useLecionamentos(salaId: string | undefined) {
  return useRequisicao<Lecionamento[]>(
    () => (salaId ? listarLecionamentos(salaId) : Promise.resolve([])),
    `lecionamentos:${salaId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar os professores da sala.' },
  )
}

export function useAlunos(salaId: string | undefined) {
  return useRequisicao<Aluno[]>(
    () => (salaId ? listarAlunos(salaId) : Promise.resolve([])),
    `alunos:${salaId ?? ''}`,
    { erroPadrao: 'Não foi possível carregar os alunos da sala.' },
  )
}
