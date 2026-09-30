/**
 * Regra de fechamento dos pesos percentuais, separada da tela de propósito.
 *
 * É a RN10 da API: os componentes de pontuação de uma mesma matéria precisam
 * somar 100% no bimestre. A regra mora numa função pura porque o indicador é o
 * que o professor olha para saber se pode encerrar o bimestre — se ele estiver
 * errado, a tela mente sobre o estado da competição. Testar por clique exigiria
 * montar quatro componentes, ir e vir entre abas e conferir texto na tela para
 * chegar a um número que aqui é uma linha.
 *
 * Os pesos chegam como número (a API converte o `Decimal(5,2)` do banco), então
 * a soma é refeita aqui em vez de confiar em `somaPesoPercentual`: 33.33 + 33.33
 * + 33.34 dá 100.00000000000001 em ponto flutuante, e arredondar a 2 casas — o
 * mesmo que o banco faz — devolve 100. Sem o arredondamento, uma matéria
 * perfeitamente fechada apareceria como "faltam 0%".
 */

export const CEM_PORCENTO = 100

/** O que a soma precisa: o nome entra no rótulo da lista, o resto é ruído. */
export interface ComponenteComPeso {
  nome: string
  pesoPercentual: number
}

export interface AvaliacaoDePesos {
  /** Soma dos pesos da matéria, arredondada a 2 casas. */
  total: number
  fechou: boolean
  /** Percentual que ainda falta para fechar; 0 quando já fechou. */
  falta: number
}

export interface ValidacaoDePeso {
  /** Peso em número, quando o texto digitado serve. */
  valor?: number
  /** Texto a mostrar no campo, quando não serve. */
  erro?: string
}

/**
 * Arredonda a duas casas, que é a precisão do `Decimal(5,2)` da coluna de peso.
 *
 * Multiplicar antes de arredondar é o que resolve o erro de ponto flutuante:
 * `Math.round(100.00000000000001 * 100) / 100` dá 100.
 */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Soma os pesos de uma matéria e diz quanto falta para fechar os 100%.
 *
 * "Fechou" é igualdade exata com 100 depois do arredondamento, que é a mesma
 * comparação que o backend faz em `materiasFechadas`. A API recusa peso que
 * ultrapassaria 100%, então a falta nunca é negativa aqui — e, se um dia for, o
 * número sai negativo em vez de ser mascarado.
 */
export function avaliarPesos(componentes: readonly ComponenteComPeso[]): AvaliacaoDePesos {
  const total = arredondar(
    componentes.reduce((soma, componente) => soma + componente.pesoPercentual, 0),
  )
  const fechou = total === CEM_PORCENTO

  return { total, fechou, falta: fechou ? 0 : arredondar(CEM_PORCENTO - total) }
}

/**
 * O indicador que o professor lê: "100% ✓" quando fechou, "faltam 60%" quando
 * não. Mesmo texto nos dois casos, porque a pergunta é uma só.
 */
export function rotuloDoPeso({ fechou, falta }: AvaliacaoDePesos): string {
  return fechou ? `${CEM_PORCENTO}% ✓` : `faltam ${falta}%`
}

/** Percentual para exibição: 60 vira "60%", 33.33 vira "33.33%". */
export function formatarPercentual(valor: number): string {
  return `${arredondar(valor)}%`
}

/*
 * Espelha o `CriarComponentePontuacaoDto`: `@IsNumber({ maxDecimalPlaces: 2 })`,
 * `@Min(0.01)` e `@Max(100)`. A vírgula não entra como separador decimal porque o
 * `Number('8,5')` do `@Type(() => Number)` da API vira NaN e a requisição é
 * recusada — aceitar vírgula aqui só empurraria o erro para o servidor.
 */
const SOMENTE_NUMERO = /^\d+(\.\d+)?$/

/**
 * Valida o peso digitado no formulário, no mesmo formato que a API aceita.
 *
 * Existe para o erro aparecer no campo enquanto se digita, não para substituir
 * a regra do servidor: a API recusa peso que fecharia a matéria em mais de 100%,
 * e essa parte depende dos componentes já criados, que só o backend soma.
 */
export function validarPesoPercentual(texto: string): ValidacaoDePeso {
  const limpo = texto.trim()

  if (!limpo) return { erro: 'Informe o peso percentual.' }

  if (!SOMENTE_NUMERO.test(limpo)) {
    return { erro: 'O peso precisa ser um número, com ponto decimal — ex.: 30 ou 12.5.' }
  }

  const valor = Number(limpo)

  if (arredondar(valor) !== valor) {
    return { erro: 'O peso aceita no máximo 2 casas decimais.' }
  }

  if (valor < 0.01) return { erro: 'O peso precisa ser maior que zero.' }

  if (valor > CEM_PORCENTO) return { erro: 'O peso não pode passar de 100%.' }

  return { valor }
}
