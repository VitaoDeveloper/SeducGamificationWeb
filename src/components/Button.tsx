import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Spinner } from './Spinner'

/**
 * Primário   -> cor de destaque (accent). A ação que o professor precisa
 *               enxergar primeiro na tela.
 * Secundário -> cor primária (primary). Navegação e ação de apoio.
 * Outline    -> borda colorida, fundo transparente. Ação terciária.
 *
 * Os tons 600 e não os 500 são o preenchimento porque os 500 ficam em 4.39:1 e
 * 4.13:1 com texto branco, abaixo das 4.5:1 que o WCAG AA exige para texto de
 * corpo. Ver src/styles/tokens.css.
 */
const VARIANTES = {
  primary:
    'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-700 disabled:hover:bg-accent-600',
  secondary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700 disabled:hover:bg-primary-600',
  outline:
    'border-2 border-primary-600 text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:hover:bg-transparent',
} as const

const TAMANHOS = {
  sm: 'h-8 px-4 text-sm gap-1.5',
  md: 'h-10 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
} as const

export type ButtonVariant = keyof typeof VARIANTES
export type ButtonSize = keyof typeof TAMANHOS

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Exibe spinner e bloqueia o clique. Use no envio de formulários. */
  loading?: boolean
  /** Mantém a largura durante o loading, para o botão não pular de lugar. */
  loadingText?: string
  fullWidth?: boolean
  leadingIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  fullWidth = false,
  leadingIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium',
        'transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTES[variant],
        TAMANHOS[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="border-white/40 border-t-white" />
      ) : (
        leadingIcon
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
