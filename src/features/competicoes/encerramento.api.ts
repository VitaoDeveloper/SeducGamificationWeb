import { AxiosError } from 'axios'
import { api } from '../../lib/api'
import { mensagemDeErro } from '../../lib/erro-api'
import type { RecusaDoEncerramento, ResultadoDoEncerramento } from './encerramento.tipos'
import type { MateriaPendente } from './componentes-pontuacao.tipos'

/**
 * Chamada de encerramento de bimestre e leitura da recusa.
 *
 * Fica em arquivo próprio porque é a única escrita irreversível da tela, e ela
 * tem duas carezas que as outras não têm: um **timeout maior** que o global e um
 * **corpo de erro com lista**. As duas estão explicadas abaixo.
 */

/**
 * A transação do encerramento tem 30 s de orçamento na API (`README-API.md`,
 * seção 11.9): ela refaz as sínteses de todos os alunos por todas as matérias
 * e grava tudo em um único commit. O `timeout` global do axios é de 15 s, o que
 * cortaria pela metade a janela que o servidor se deu — e cortar um encerramento
 * não é como cortar uma listagem: aqui o professor ficaria sem saber se a
 * transação foi gravada ou revertida.
 *
 * 60 s é folga sobre os 30 s do servidor: se estourar, foi a rede ou o servidor,
 * e a mensagem que a tela mostra (em `recusaDoEncerramento`) manda recarregar a
 * página para ver a situação em vez de mandar tentar de novo.
 */
const TIMEOUT_DE_ENCERRAMENTO = 60000

/**
 * `POST /bimestres/:id/encerrar` — calcula e grava as sínteses e congela o
 * bimestre.
 *
 * Sem corpo: o bimestre vem na URL, e o que a API precisa verificar (pesos
 * fechados, notas lançadas) ela lê do banco dentro da mesma transação.
 *
 * A chamada não engole erro — a decisão do que fazer com a recusa é do componente
 * de tela, que tem o modal aberto e sabe o que oferecer ao professor.
 */
export async function encerrarBimestre(bimestreId: string): Promise<ResultadoDoEncerramento> {
  const { data } = await api.post<ResultadoDoEncerramento>(`/bimestres/${bimestreId}/encerrar`, undefined, {
    timeout: TIMEOUT_DE_ENCERRAMENTO,
  })
  return data
}

/** Mensagem padrão quando a recusa não traz texto da API. */
const MENSAGEM_PADRAO = 'Não foi possível encerrar o bimestre.'

/**
 * Mensagem padrão quando a recusa é por pesos abertos e o corpo não traz
 * `message`.
 *
 * Escrever a regra em português, e não repetir o 400 cru, é o que a Etapa 07
 * pede: o professor precisa sair do modal sabendo o que fazer, e "Bad Request"
 * não diz nada.
 */
const MENSAGEM_DE_PESOS_ABERTOS =
  'Todas as matérias precisam somar 100% de pesos para encerrar o bimestre.'

/** Texto que a tela mostra quando o encerramento estoura o tempo. */
const MENSAGEM_DE_TIMEOUT =
  'O encerramento demorou demais e pode ter sido interrompido. Recarregue a página para ver a situação do bimestre antes de tentar de novo.'

/**
 * Lê a recusa do encerramento, com a lista de matérias pendentes quando ela vem.
 *
 * A API recusa o encerramento com 400 e a lista de matérias que não fecham 100%
 * (`README-API.md`, seção 7: "O encerramento exige que todas as matérias somem
 * 100% de pesos (400 com a lista de pendências)"). A lista é a mesma que
 * `POST /bimestres/:id/componentes-pontuacao/validar` devolve, e a tela precisa
 * dela: dizer apenas "os pesos não fecham" obrigaria o professor a caçar a
 * matéria entre as abas.
 *
 * A lista é procurada em dois lugares — no corpo e dentro do `message` — porque
 * as duas formas aparecem em exceções do NestJS: `BadRequestException` com objeto
 * põe os campos no corpo; a que passa a lista dentro do `message` tem
 * `message` como objeto, o que `mensagemDeErro` (que só sabe ler string e array)
 * não entenderia. Aceitar as duas é mais barato que um `try` de tela quebrada.
 */
export function recusaDoEncerramento(falha: unknown): RecusaDoEncerramento {
  if (falha instanceof AxiosError && falha.code === 'ECONNABORTED') {
    return { mensagem: MENSAGEM_DE_TIMEOUT, materiasPendentes: [], tempoEsgotado: true }
  }

  const corpo = (falha as { response?: { data?: unknown } } | undefined)?.response?.data
  const pendentes = materiasPendentesDo(corpo)
  const mensagem = textoDaRecusa(corpo)

  return {
    mensagem:
      mensagem ??
      (pendentes.length > 0
        ? MENSAGEM_DE_PESOS_ABERTOS
        : mensagemDeErro(falha, MENSAGEM_PADRAO)),
    materiasPendentes: pendentes,
    tempoEsgotado: false,
  }
}

/** A lista de pendências, se estiver no corpo (no topo ou dentro de `message`). */
function materiasPendentesDo(corpo: unknown): MateriaPendente[] {
  const pendentes = (corpo as { materiasPendentes?: unknown } | undefined)?.materiasPendentes
  if (Array.isArray(pendentes)) return pendentes as MateriaPendente[]

  const dentroDaMensagem = (corpo as { message?: { materiasPendentes?: unknown } } | undefined)
    ?.message?.materiasPendentes

  return Array.isArray(dentroDaMensagem) ? (dentroDaMensagem as MateriaPendente[]) : []
}

/** O texto da recusa, seja string no corpo, seja array do ValidationPipe. */
function textoDaRecusa(corpo: unknown): string | null {
  const mensagem = (corpo as { message?: unknown } | undefined)?.message

  if (typeof mensagem === 'string' && mensagem.trim().length > 0) return mensagem
  if (Array.isArray(mensagem)) {
    const textos = mensagem.filter((item): item is string => typeof item === 'string')
    if (textos.length > 0) return textos.join(' ')
  }

  return null
}
