import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Ação principal da página, à direita (ex.: botão "Nova sala"). */
  action?: ReactNode
  className?: string
}

/**
 * Cabeçalho de página: título, contexto e a ação principal.
 *
 * Fica sobre o fundo neutro da página, sem o gradiente institucional, para
 * as telas de trabalho manterem o tom sóbrio. O gradiente é da tela de login.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'border-line-strong/40 flex flex-wrap items-start justify-between gap-4 border-b pb-5',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold">{title}</h1>
        {description ? (
          <p className="text-neutral-500 mt-1.5 text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap shrink-0 gap-2 justify-end">{action}</div> : null}
    </header>
  )
}
