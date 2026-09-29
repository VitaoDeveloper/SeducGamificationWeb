/**
 * Junta nomes de classe, ignorando os falsos.
 *
 * Sem dependência externa: clsx + tailwind-merge resolvem o mesmo problema, mas
 * o ganho aqui é pequeno e o projeto não usa merge de utilitários conflitantes.
 * A ordem das classes é preservada, e classes repetidas passam direto: o
 * resultado é aplicado ao elemento e a última vence por cascade do CSS.
 */
export type ClassValue = string | false | null | undefined

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
