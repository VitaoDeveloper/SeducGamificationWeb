/**
 * Modelo de avaliação da escola, que decide o formato do lançamento de nota.
 *
 * A escola é numérica (1 a 10) ou conceitual (I, R, B, MB — o CPS da ETEC), e o
 * campo que o professor preenche precisa mudar junto: escrever "8.5" num seletor
 * de rótulos, ou "MB" num campo numérico, erra a cada aluno da turma.
 *
 * **O modelo vem da API, e é ela quem decide.** `GET /salas` e `GET /escolas`
 * mandam a escola com `modeloAvaliacao: { tipoEscala, nivelEscalas }`, e o
 * `LancamentosService` valida o lançamento contra o mesmo dado do banco. Renderizar
 * e validar lendo a mesma resposta é o que impede o cadastro de ser recusado com
 * 400 depois de a tela ter aceitado o valor — o que acontecia quando esta função
 * devolvia um modelo fixo para toda escola, e a escola numérica via o seletor de
 * conceitos.
 *
 * Quando a API não diz qual é o modelo, `modeloAvaliacaoDaEscola` devolve `null` e
 * a tela **não mostra campo nenhum**: sem saber a escala, qualquer campo mostrado
 * erraria a turma. Inventar um modelo é o que produziu o bug; o caminho honesto é
 * recusar e dizer por quê.
 */

import type { EscalaParaCalculo } from '../../lib/sinteseCalculo'
import type { EscolaResumo } from '../salas/salas.tipos'

export const TIPO_ESCALA = {
  NUMERICA: 'NUMERICA',
  CPS_ETEC: 'CPS_ETEC',
} as const

export type TipoEscala = (typeof TIPO_ESCALA)[keyof typeof TIPO_ESCALA]

/**
 * O modelo de avaliação da escola, com o que a conta da síntese precisa.
 *
 * Estende `EscalaParaCalculo` porque a prévia de síntese (Etapa 06) converte o
 * que foi lançado para número, e essa conversão é a do backend: no modelo
 * numérico o valor é direto, no conceitual o rótulo vale o `valorNumerico` do
 * nível. Sem `niveis` no modelo a tela teria os rótulos mas não os números, e a
 * conta é feita no front.
 */
export interface ModeloAvaliacao extends EscalaParaCalculo {
  /**
   * Rótulos do modelo conceitual, na ordem da escala. Vazio no numérico, que não
   * tem rótulo: o professor digita o número.
   *
   * Derivado de `niveis` por `modeloAvaliacaoDaEscola`, e não escrito à mão: as
   * duas coisas descreveriam a mesma escala, e divergirem entre si mostraria um
   * "MB" no seletor que a conta não soube converter.
   */
  rotulos: string[]
}

export interface ValidacaoDeValor {
  valido: boolean
  /** Texto a mostrar no campo da nota, quando o valor não serve. */
  erro?: string
}

/** Limites do `Input type="number"`, que espelham a validação do backend. */
export const ESCALA_NUMERICA = { minimo: 1, maximo: 10, passo: 0.01 } as const

/*
 * O mesmo `REGEX_NUMERICO` do `LancamentosService`: uma ou duas casas inteiras e
 * até duas decimais, com ponto. "8,5", "8.567" e "11" caem fora.
 */
const REGEX_NUMERICO = /^\d{1,2}(\.\d{1,2})?$/

/**
 * O que a tela diz quando não sabe qual é o modelo da escola.
 *
 * Fica aqui, e não em cada componente, para que Lançamentos e Prévia falem a mesma
 * coisa: são as duas telas que leem o modelo, e um texto diferente em cada uma
 * faria o mesmo erro parecer dois problemas.
 */
export const SEM_MODELO_DE_AVALIACAO =
  'A API não informou o modelo de avaliação desta escola, então o campo de nota fica indisponível: sem saber se a escala é numérica ou de conceitos, qualquer campo mostrado erraria a turma inteira. Recarregue a página — se o aviso continuar, é a API que está desatualizada.'

/** O modelo pede um número digitado, e não um seletor de rótulos? */
export function ehEscalaNumerica(modelo: ModeloAvaliacao): boolean {
  return modelo.tipoEscala === TIPO_ESCALA.NUMERICA
}

/**
 * O modelo de avaliação da escola da sala, como a API mandou.
 *
 * Devolve `null` quando a resposta não traz um modelo que a tela saiba mostrar:
 * escola ausente (a sala ainda está carregando) e `tipoEscala` que não é um dos
 * dois conhecidos. Nesses casos quem chama mostra `SEM_MODELO_DE_AVALIACAO` em vez
 * de um campo — é a diferença entre uma tela que avisa e uma que lança conceito
 * onde a API exige nota de 1 a 10.
 *
 * Os níveis vêm ordenados pelo `valorNumerico`, e não na ordem que a API
 * mandou: `niveis_escala` não tem coluna de ordem, então a ordem do banco é
 * qualquer uma, e o que diz em que ponto da escala cada rótulo está é o valor que
 * ele vale. Sem a ordenação, o seletor mudaria de ordem entre duas respostas da
 * mesma escola.
 */
export function modeloAvaliacaoDaEscola(
  escola: EscolaResumo | null | undefined,
): ModeloAvaliacao | null {
  const tipoEscala = escola?.modeloAvaliacao?.tipoEscala

  if (tipoEscala === TIPO_ESCALA.NUMERICA) {
    // A escala é a de 1 a 10, digitada, e por isso não tem níveis: um "nível"
    // aqui seria um valor que a conta não sabe converter.
    return { tipoEscala: TIPO_ESCALA.NUMERICA, niveis: [], rotulos: [] }
  }

  if (tipoEscala !== TIPO_ESCALA.CPS_ETEC) return null

  const niveis = [...(escola!.modeloAvaliacao.nivelEscalas ?? [])].sort(
    (a, b) => a.valorNumerico - b.valorNumerico,
  )

  /*
   * Modelo conceitual sem nenhum rótulo é cadastro incompleto, e não um modelo
   * vazio: o seletor ficaria sem uma única opção e a validação recusaria toda nota
   * com a mensagem de "escolha um destes rótulos" — uma lista vazia. Sem os
   * rótulos não há campo que possa ser mostrado, então é `null` como o tipo
   * desconhecido.
   */
  if (niveis.length === 0) return null

  return {
    tipoEscala: TIPO_ESCALA.CPS_ETEC,
    niveis: niveis.map((nivel) => ({
      rotulo: nivel.rotulo,
      valorNumerico: nivel.valorNumerico,
    })),
    rotulos: niveis.map((nivel) => nivel.rotulo),
  }
}

/**
 * Confere uma nota contra o modelo, com as mesmas regras do `LancamentosService`.
 *
 * Roda no formulário para o erro aparecer no campo da nota antes da ida ao
 * servidor. O backend continua sendo quem decide: ele valida o modelo do banco,
 * e o erro dele é exibido como está. Os dois leem a mesma escala agora, então
 * Discordar exigiria a troca da escala da escola no meio da sessão.
 */
export function validarValorNoModelo(
  modelo: ModeloAvaliacao,
  valor: string,
): ValidacaoDeValor {
  const limpo = valor.trim()

  if (!limpo) return { valido: false, erro: 'Informe a nota.' }

  if (ehEscalaNumerica(modelo)) {
    if (!REGEX_NUMERICO.test(limpo)) {
      return { valido: false, erro: 'Use número de 1 a 10, com ponto decimal — ex.: 8.5.' }
    }

    const numero = Number(limpo)
    if (numero < ESCALA_NUMERICA.minimo || numero > ESCALA_NUMERICA.maximo) {
      return { valido: false, erro: 'A nota precisa estar entre 1 e 10.' }
    }

    return { valido: true }
  }

  if (!modelo.rotulos.includes(limpo)) {
    return { valido: false, erro: `Escolha um destes rótulos: ${modelo.rotulos.join(', ')}.` }
  }

  return { valido: true }
}