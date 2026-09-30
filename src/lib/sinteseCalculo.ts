/**
 * As fórmulas de síntese, replicadas da API.
 *
 * A API só grava as sínteses no encerramento do bimestre (Etapa 07). Antes disso
 * não existe rota de "síntese parcial", mas o professor precisa ver a nota de
 * cada aluno **enquanto ainda está lançando** — depois de encerrar não há como
 * desfazer. Esta etapa calcula isso no front, como prévia.
 *
 * Por isso este arquivo é uma cópia deliberada do `SinteseCalculoService` do
 * backend (`src/modules/sinteses/sintese-calculo.service.ts`), e não uma
 * interpretação das fórmulas de `docs/03-regras-de-calculo.md`. As duas coisas
 * que mais importam para a cópia ser exata:
 *
 * 1. **O arredondamento é `Number(valor.toFixed(2))`, não
 *    `Math.round(valor * 100) / 100`.** Os dois divergem justamente nos empates
 *    de meia casa, e o caso é alcançável: notas 1, 1 e 5.25 com pesos 50/20/30
 *    dão 2.275 na conta bruta — `toFixed` devolve **2.27** e `Math.round`
 *    devolve 2.28. Com a conta errada, a prévia e o valor gravado no
 *    encerramento divergem na terceira casa, que é o empate do ranking.
 * 2. **Cada etapa arredonda antes da próxima.** A síntese da matéria já vai
 *    arredondada para a média bimestral, e a bimestral vai arredondada para a
 *    do grupo — é o que o backend faz, e o que a pendência 10 do doc `03`
 *    ("cálculos encadeados usam o valor já arredondado ou o bruto?") deixa
 *    definido na implementação dele.
 *
 * O denominador da síntese bimestral é **todas** as matérias do lecionamento, e
 * não só as que já têm nota lançada: é assim que `calcularSintesesDosAlunos`
 * monta a lista, e é o que a prévia precisa mostrar para não mentir sobre o
 * que será gravado. A montagem dos dados (quais componentes, quais alunos,
 * quais notas) é do `features/competicoes/previa-sintese.ts`, que é quem conhece
 * as formas que a API devolve; aqui mora só a conta.
 */

/** Um nível da escala da escola: o rótulo lançado e o número que ele vale. */
export interface NivelDaEscala {
  rotulo: string
  valorNumerico: number
}

/**
 * Tipos de escala que a conta distingue.
 *
 * Declaração local em vez de import de `features/competicoes/modelo-avaliacao`:
 * `src/lib` não depende de feature, e o `ModeloAvaliacao` da tela é
 * estruturalmente compatível com este formato — `tipoEscala` é a mesma união de
 * literais e `niveis` é a mesma lista.
 */
export type TipoDeEscala = 'NUMERICA' | 'CPS_ETEC'

/** O que a conta precisa saber da escola — o recorte mínimo do modelo. */
export interface EscalaParaCalculo {
  tipoEscala: TipoDeEscala
  niveis: readonly NivelDaEscala[]
}

/**
 * Um componente de pontuação na conta da matéria, com a nota do aluno.
 *
 * `valorNoModelo` ausente é o mesmo que `''`: componente sem lançamento vale 0
 * (RN19 da API). É assim que o "campo em branco" da tela de lançamentos entra
 * na conta.
 */
export interface EntradaDaSintese {
  valorNoModelo?: string | null
  pesoPercentual: number
}

/**
 * Duas casas decimais, arredondadas — a mesma expressão do backend.
 *
 * `toFixed` e não `Math.round(valor * 100) / 100`: nos empates de meia casa os
 * dois discordam, e é a expressão do backend que manda. Ver o cabeçalho.
 */
export function arredondarParaDuasCasas(valor: number): number {
  return Number(valor.toFixed(2))
}

/**
 * Converte o que foi lançado no modelo da escola para o número da conta.
 *
 * Espelha `converterValorParaNumero` do backend, com uma única diferença
 * deliberada: lá um texto sem número nenhum (`'abc'`) viraria `NaN` e
 * contaminaria a síntese da matéria inteira; aqui é 0, que é o valor que a API
 * gravaria para um lançamento ausente.
 *
 * Texto *parcialmente* numérico (`'8,5'`, `'8.5abc'`) segue o `parseFloat` do
 * backend, e isso é de propósito: o `LancamentosService` recusa esses lançamentos
 * com 400 antes de calcular, e quem evita que eles cheguem até aqui é a tela, que
 * só entrega entrada que passou em `validarValorNoModelo` (ver
 * `features/competicoes/previa-sintese.ts`). A conta não repete a validação: a
 * API também não.
 */
export function converterNotaParaNumero(escala: EscalaParaCalculo, valorNoModelo: string): number {
  if (escala.tipoEscala === 'NUMERICA') {
    const numero = Number.parseFloat(valorNoModelo.trim())
    return Number.isFinite(numero) ? numero : 0
  }

  return escala.niveis.find((nivel) => nivel.rotulo === valorNoModelo.trim())?.valorNumerico ?? 0
}

/**
 * Síntese do aluno por matéria: `Σ (nota_i × peso_i / 100)`.
 *
 * Componente sem lançamento entra como nota 0, sem sumir da lista: o peso dele
 * continua contando, que é o que o backend faz ao montar as entradas da
 * matéria.
 */
export function sinteseDaMateria(
  entradas: readonly EntradaDaSintese[],
  escala: EscalaParaCalculo,
): number {
  let soma = 0

  for (const entrada of entradas) {
    const nota = entrada.valorNoModelo?.trim()
      ? converterNotaParaNumero(escala, entrada.valorNoModelo)
      : 0
    soma += (nota * entrada.pesoPercentual) / 100
  }

  return arredondarParaDuasCasas(soma)
}

/** Média simples de uma lista de valores já arredondados; lista vazia é 0. */
function mediaSimples(valores: readonly number[]): number {
  if (valores.length === 0) return 0

  const soma = valores.reduce((total, valor) => total + valor, 0)
  return arredondarParaDuasCasas(soma / valores.length)
}

/**
 * Síntese bimestral do aluno: média simples entre as matérias.
 *
 * Recebe as sínteses **por matéria** — uma por matéria do lecionamento, já
 * arredondadas por `sinteseDaMateria`. Matéria sem componente nenhum entra com
 * 0 e continua no denominador, porque é assim que o backend monta a lista.
 */
export function sinteseBimestralDoAluno(sintesesPorMateria: readonly number[]): number {
  return mediaSimples(sintesesPorMateria)
}

/**
 * Síntese bimestral do grupo: média das sínteses bimestrais dos integrantes.
 *
 * Lista vazia é 0, e quem decide se o grupo entra na conta é a montagem dos
 * dados: o encerramento não grava síntese de grupo para grupo sem integrante
 * (`gruposSemIntegrantes`), e a prévia mostra "sem integrantes" em vez de um 0
 * que o backend nunca gravaria.
 */
export function sinteseBimestralDoGrupo(sintesesDosIntegrantes: readonly number[]): number {
  return mediaSimples(sintesesDosIntegrantes)
}

/**
 * A síntese como o professor lê: sempre duas casas, com ponto.
 *
 * `8.2` vira "8.20" e não "8.2" — a coluna de prévia é comparada linha a linha
 * com a do painel, e número com casas diferentes parece que são valores
 * diferentes. O ponto é o mesmo que o campo de nota e que `formatarPercentual`:
 * a vírgula decimal é rejeitada pela API, então mostrar vírgula aqui ensinaria
 * o professor a digitar errado.
 */
export function formatarSintese(valor: number): string {
  return arredondarParaDuasCasas(valor).toFixed(2)
}
