/**
 * Montagem e conferência do lote de notas, antes da chamada à API.
 *
 * A tela de lançamentos é uma linha por aluno da sala, e o professor pode estar
 * preenchendo a turma inteira ou só retocando dois nomes. Por isso a regra aqui
 * é: campo em branco **não vai no lote** — a API trata ausência de lançamento
 * como 0 no cálculo, e um campo vazio enviado como "" seria recusado com 400
 * derrubando as notas que estavam certas. O que vai no lote é o que foi
 * digitado, e cada valor passa pelo mesmo recorte do `LancamentosService`.
 *
 * Separado da tela porque são três decisões — o que entra no lote, o que é erro,
 * e o que é o payload — que valem ser testadas sem renderizar 30 linhas de
 * tabela e clicar em 30 campos.
 */

import { validarValorNoModelo } from './modelo-avaliacao'
import type { ModeloAvaliacao } from './modelo-avaliacao'
import type { LancarNota } from './componentes-pontuacao.tipos'

/** Uma linha da tabela de lançamentos: o aluno e o que está no campo agora. */
export interface NotaDigitada {
  alunoId: string
  valor: string
}

/** Nota que não passou no modelo, com o aluno a que ela pertence. */
export interface ErroDeNota {
  alunoId: string
  erro: string
}

export interface ValidacaoDasNotas {
  /** Dá para enviar? Falso se alguma nota preenchida está fora do modelo. */
  valido: boolean
  /** Corpo de `POST .../lancamentos/lote`, já sem os campos em branco. */
  lancamentos: LancarNota[]
  /** Nota preenchida e inválida, por aluno. */
  erros: ErroDeNota[]
  /** Quantos campos têm algo digitado — o resto fica de fora do lote. */
  preenchidas: number
}

/**
 * Separa o que vai ser salvo do que é erro.
 *
 * Um aluno sem nota não trava ninguém: ele some do lote e os outros salvam
 * (regra da Etapa 05). Uma nota fora do modelo trava o envio inteiro, porque
 * salvá-la exigiria mandá-la assim mesmo, e a API recusaria o lote todo.
 */
export function validarNotas(
  notas: readonly NotaDigitada[],
  modelo: ModeloAvaliacao,
): ValidacaoDasNotas {
  const lancamentos: LancarNota[] = []
  const erros: ErroDeNota[] = []
  let preenchidas = 0

  for (const nota of notas) {
    if (!nota.valor.trim()) continue

    preenchidas += 1

    const validacao = validarValorNoModelo(modelo, nota.valor)
    if (validacao.valido) {
      lancamentos.push({ alunoId: nota.alunoId, valorNoModelo: nota.valor.trim() })
    } else {
      erros.push({ alunoId: nota.alunoId, erro: validacao.erro ?? 'Nota inválida.' })
    }
  }

  return { valido: erros.length === 0, lancamentos, erros, preenchidas }
}
