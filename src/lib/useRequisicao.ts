import { useCallback, useEffect, useRef, useState } from 'react'
import { mensagemDeErro } from './erro-api'

export interface Requisicao<T> {
  /** Resposta da chamada, ou null enquanto não houver nenhuma. */
  dados: T | null
  /**
   * Primeira carga: ainda não há nada em tela para o professor olhar.
   *
   * Separada de `recarregando` de propósito. Depois de cadastrar um aluno, a
   * lista continua na tela enquanto a versão nova chega — o esqueleto do
   * `Table` é para a primeira carga, e sumir e voltar com cada cadastro seria
   * pior do que esperar.
   */
  carregando: boolean
  /** Há dados em tela e uma requisição em andamento por baixo. */
  recarregando: boolean
  /** Mensagem da API, já pronta para a tela. */
  erro: string | null
  /** Refaz a chamada, mantendo os dados anteriores em tela. */
  recarregar: () => void
}

export interface OpcoesDaRequisicao {
  /** Texto quando a falha não tem mensagem da API (rede, timeout). */
  erroPadrao?: string
  /**
   * Reescreve a mensagem de uma falha específica; `null` mantém a mensagem da
   * API.
   *
   * Existe porque `mensagemDeErro` sabe ler o corpo do NestJS, mas há recusas em
   * que a mensagem do backend não serve para a tela: o `403` de acesso a um
   * ranking chega como "Forbidden", que não diz a ninguém o que fazer. Quem
   * chama trata o caso que conhece e devolve `null` no resto, e o tratamento
   * padrão continua valendo para rede, timeout e erros de aplicação.
   */
  traduzirErro?: (falha: unknown) => string | null
}

/** Resposta de uma requisição, com o pedido a que pertence. */
interface Resposta<T> {
  pedido: string
  /** Chave que o pedido buscava — a resposta só vale para a mesma chave. */
  chave: string
  dados: T | null
  erro: string | null
}

/**
 * Busca de dados para uma tela, com os estados que toda listagem tem.
 *
 * Nasce na Etapa 03 porque as três telas da sala (salas, lecionamentos e
 * alunos) precisam do mesmo trio — carregando, erro e dados — e sem biblioteca
 * de cache cada uma reescreveria o mesmo `useEffect` com três `useState`, que
 * é onde mora o bug de requisição que chega fora de ordem.
 *
 * Duas decisões que valem conhecer antes de mexer:
 *
 * 1. **`chave` em vez de array de dependências.** O que muda a busca é o id da
 *    sala, e ele chega como string. Um array seria mais flexível, mas quem
 *    chamasse precisaria acertar a ordem das dependências a cada chamada, e um
 *    item errado ali é uma busca que refaz a cada render.
 * 2. **A resposta guarda a chave e o pedido que a produziram.** É o que
 *    distingue "carregando pela primeira vez" de "atualizando por baixo": uma
 *    resposta antiga só conta enquanto for da mesma chave, e só conta como
 *    atualizada enquanto o pedido que a espera for outro.
 */
export function useRequisicao<T>(
  carregar: () => Promise<T>,
  chave: string,
  {
    erroPadrao = 'Não foi possível carregar os dados.',
    traduzirErro,
  }: OpcoesDaRequisicao = {},
): Requisicao<T> {
  const [resposta, setResposta] = useState<Resposta<T> | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const pedido = `${chave}#${tentativa}`

  /*
   * O carregador vai para uma ref em vez de entrar na lista de dependências: ele
   * é uma arrow function nova a cada render, e dependência de função refaz a
   * busca em toda render. Quem manda no refetch é `chave`.
   */
  const carregador = useRef(carregar)
  const padraoDeErro = useRef(erroPadrao)
  const tradutor = useRef(traduzirErro)

  // Antes do efeito da busca, para que a busca do render já leia a versão nova.
  useEffect(() => {
    carregador.current = carregar
    padraoDeErro.current = erroPadrao
    tradutor.current = traduzirErro
  }, [carregar, erroPadrao, traduzirErro])

  useEffect(() => {
    let cancelado = false

    carregador.current().then(
      (dados) => {
        if (cancelado) return
        setResposta({ pedido, chave, dados, erro: null })
      },
      (falha) => {
        if (cancelado) return
        const erro =
          tradutor.current?.(falha) ?? mensagemDeErro(falha, padraoDeErro.current)
        // Uma falha ao recarregar não apaga a lista que já estava boa: o
        // professor continua lendo os nomes, com o aviso do erro em cima.
        setResposta((atual) => ({
          pedido,
          chave,
          dados: atual?.chave === chave ? atual.dados : null,
          erro,
        }))
      },
    )

    // Sair da tela no meio da requisição não deve escrever estado depois.
    return () => {
      cancelado = true
    }
  }, [pedido, chave])

  const recarregar = useCallback(() => setTentativa((n) => n + 1), [])

  const emVoo = resposta?.pedido !== pedido
  const dados = resposta?.chave === chave ? resposta.dados : null

  return {
    dados,
    carregando: emVoo && dados === null,
    recarregando: emVoo && dados !== null,
    erro: emVoo ? null : (resposta?.erro ?? null),
    recarregar,
  }
}
