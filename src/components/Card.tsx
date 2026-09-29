import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

/**
 * Formas da barra de destaque da referência: base, lateral ou nenhuma.
 * `top` e `left` desenham a barra dentro do card, sem ocupar espaço no fluxo.
 */
export type CardBarPosition = 'top' | 'left' | 'none'
export type CardTone = 'primary' | 'accent' | 'neutral'

const BARRAS: Record<Exclude<CardBarPosition, 'none'>, string> = {
  top: 'inset-x-0 top-0 h-1.5',
  left: 'inset-y-0 left-0 w-1.5',
}

const TONS: Record<CardTone, string> = {
  primary: 'bg-primary-500',
  accent: 'bg-accent-500',
  neutral: 'bg-neutral-300',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  bar?: CardBarPosition
  tone?: CardTone
  /** Remove o padding interno, para cards que são só container de tabela. */
  bare?: boolean
}

export function Card({
  bar = 'top',
  tone = 'primary',
  bare = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border-line relative overflow-hidden rounded-card border shadow-card',
        !bare && 'p-6',
        className,
      )}
      {...props}
    >
      {bar !== 'none' ? (
        <span aria-hidden className={cn('absolute', BARRAS[bar], TONS[tone])} />
      ) : null}
      {children}
    </div>
  )
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  )
}
