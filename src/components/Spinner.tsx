import { cn } from '../lib/cn'

const TAMANHOS = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-[3px]',
} as const

export type SpinnerSize = keyof typeof TAMANHOS

export interface SpinnerProps {
  size?: SpinnerSize
  className?: string
  /** Rótulo para leitores de tela. Sem ele, o spinner é announced como decorativo. */
  label?: string
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-block shrink-0 animate-spin rounded-full',
        'border-primary-200 border-t-accent-600',
        TAMANHOS[size],
        className,
      )}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
