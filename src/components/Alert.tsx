import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'

export type AlertTone = 'erro' | 'sucesso' | 'info'

const ESTILOS: Record<AlertTone, { caixa: string; icone: string }> = {
  erro: {
    caixa: 'border-accent-200 bg-accent-50 text-accent-700',
    icone: 'text-accent-600',
  },
  sucesso: {
    caixa: 'border-primary-200 bg-primary-50 text-primary-700',
    icone: 'text-primary-600',
  },
  info: {
    caixa: 'border-line bg-neutral-50 text-neutral-600',
    icone: 'text-neutral-400',
  },
}

/**
 * Ícones por tom, desenhados no mesmo traço do resto da interface.
 *
 * Ficam em volta de `Alert` porque um arquivo que exporta componente e dados
 * faz o Fast Refresh do Vite recarregar a página inteira.
 */
export function IconeDoAlerta({ tone }: { tone: AlertTone }) {
  const comum = 'size-5 shrink-0'

  if (tone === 'sucesso') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={comum}>
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  if (tone === 'erro') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={comum}>
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V7Zm-1 7.5a1 1 0 0 0 0 2 1 1 0 0 0 0-2Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={comum}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V7Zm-1 7.5a1 1 0 0 0 0 2 1 1 0 0 0 0-2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone
  /** some, sem o ícone. Para aviso de página, não erro de campo. */
  semIcone?: boolean
  children: ReactNode
}

/**
 * Faixa de erro, sucesso ou aviso dentro de uma tela.
 *
 * Existe porque o bloco de erro estava copiado em todas as telas de formulário
 * e ia ser copiado uma vez por formulário novo. O `role` acompanha o tom — erro
 * interrompe (`alert`), o resto é_annotation (`status`) — para o leitor de tela
 * não anunciar um aviso de sucesso com a urgência de uma falha.
 */
export function Alert({
  tone = 'erro',
  semIcone = false,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === 'erro' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
        ESTILOS[tone].caixa,
        className,
      )}
      {...props}
    >
      {semIcone ? null : (
        <span className={cn('mt-px', ESTILOS[tone].icone)}>
          <IconeDoAlerta tone={tone} />
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
