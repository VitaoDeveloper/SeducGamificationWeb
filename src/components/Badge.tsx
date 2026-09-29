import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * Estados de uma sala na listagem: onde o professor já leciona e onde ele
 * ainda pode se inscrever. Os tons siguem a regra de contraste dos botões —
 * preenchimento com texto branco usa 600, nunca 500.
 */
export type BadgeTone = 'primary' | 'accent' | 'neutro'

const TONS: Record<BadgeTone, string> = {
  primary: 'bg-primary-50 text-primary-700',
  accent: 'bg-accent-50 text-accent-700',
  neutro: 'bg-neutral-100 text-neutral-600',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
}

/**
 * Etiqueta de estado, em linha com o conteúdo da célula.
 *
 * Sai do `Table` como o resto do design system: é forma, não conteúdo, e as
 * próximas etapas (bimestre aberto/encerrado, desempate manual/automático) vão
 * precisar da mesma coisa.
 */
export function Badge({ tone = 'neutro', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONS[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
