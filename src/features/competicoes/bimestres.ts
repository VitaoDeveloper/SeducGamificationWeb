/**
 * Validação das datas dos 4 bimestres, separada da tela de propósito.
 *
 * A regra é a mesma que a API aplica em `CompeticoesService.validarBimestres`, e
 * mora numa função pura para ser testada isoladamente, sem renderizar formulário
 * nenhum: são seis casos de data errada, e todos eles seriam caros de reproduzir
 * por clique.
 *
 * As datas trafegam aqui como texto `aaaa-mm-dd`, que é o que o `<input
 * type="date">` produz e o que ordena corretamente como string — sem `Date`, não
 * há fuso horário para atrapalhar a comparação dentro do mesmo dia.
 */

export interface BimestreForm {
  numero: number
  /** Data no formato `aaaa-mm-dd`, ou string vazia quando ainda não preenchida. */
  dataInicio: string
  dataFim: string
}

export interface ErroDeBimestre {
  dataInicio?: string
  dataFim?: string
}

export interface ValidacaoDeBimestres {
  valido: boolean
  /** Erros por número do bimestre, no formato que o `Field` consome. */
  porNumero: Record<number, ErroDeBimestre>
  /** Erro que é do conjunto inteiro (sobreposição ou ordem), não de um bloco. */
  geral?: string
}

/**
 * Valida os quatro bimestres: cada um com fim depois do início e, em conjunto,
 * em ordem crescente e sem sobreposição.
 *
 * Os erros de data solta têm prioridade sobre o erro de conjunto: sem todas as
 * datas preenchidas não há como julgar sobreposição, e apontar "estão
 * sobrepostos" num formulário em branco confundiria mais do que ajudaria.
 */
export function validarBimestres(bimestres: BimestreForm[]): ValidacaoDeBimestres {
  const porNumero: Record<number, ErroDeBimestre> = {}

  for (const bimestre of bimestres) {
    const erro: ErroDeBimestre = {}

    if (!bimestre.dataInicio) erro.dataInicio = 'Informe a data de início.'
    if (!bimestre.dataFim) erro.dataFim = 'Informe a data de fim.'

    if (!erro.dataInicio && !erro.dataFim && bimestre.dataFim <= bimestre.dataInicio) {
      erro.dataFim = 'A data de fim deve ser depois da data de início.'
    }

    if (erro.dataInicio || erro.dataFim) porNumero[bimestre.numero] = erro
  }

  let geral: string | undefined

  if (Object.keys(porNumero).length === 0) {
    const ordenados = [...bimestres].sort((a, b) => a.numero - b.numero)

    for (let i = 1; i < ordenados.length; i++) {
      // Um bimestre só pode começar depois de o anterior terminar. No mesmo dia
      // já é sobreposição: o `<=` é a regra da API, não um detalhe do front.
      if (ordenados[i]!.dataInicio <= ordenados[i - 1]!.dataFim) {
        geral = 'Os bimestres precisam ficar em ordem crescente, sem datas sobrepostas.'
        break
      }
    }
  }

  return { valido: !geral && Object.keys(porNumero).length === 0, porNumero, geral }
}

/**
 * Converte `aaaa-mm-dd` para o ISO em UTC que a API espera.
 *
 * O `Z` no fim é intencional: `new Date('aaaa-mm-dd')` já é meia-noite UTC, e
 * usar a hora local faria a data andar um dia para quem está a oeste de
 * Greenwich. O dia que o professor digitou é o dia que deve ser gravado.
 */
export function dataParaISO(data: string): string {
  return new Date(`${data}T00:00:00.000Z`).toISOString()
}

/** Rótulo do bimestre, na ordem que a escola usa: 1º, 2º, 3º e 4º. */
export function rotuloDoBimestre(numero: number): string {
  return `${numero}º Bimestre`
}

const FORMATO_DE_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  // As datas são gravadas à meia-noite UTC; formatar no fuso local empurraria
  // 01/02 para 31/01 para quem está a oeste de Greenwich.
  timeZone: 'UTC',
})

/** Data do bimestre no formato do professor: 01/02/2026. */
export function formatarData(iso: string): string {
  return FORMATO_DE_DATA.format(new Date(iso))
}
