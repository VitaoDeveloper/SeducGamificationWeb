import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { useField } from './field-context'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  prefix?: string
}

const BASE =
  'w-full appearance-none rounded-lg border bg-surface py-2.5 pr-10 pl-3.5 text-sm ' +
  'text-neutral-800 transition-colors ' +
  'focus:outline-none focus-visible:outline-none'

const ESTADO = {
  neutro: 'border-line-strong focus:border-primary-600 focus:ring-2 focus:ring-primary-200',
  erro:
    'border-accent-600 focus:border-accent-600 focus:ring-2 ' +
    'focus:ring-accent-200',
} as const

/**
 * Lista suspensa.
 *
 * Espelha o `Input` de propósito: mesma borda em repouso (`--color-line-strong`,
 * por causa do 3:1 do WCAG 1.4.11), mesmo contexto de `Field` para o id e o
 * estado de erro, e a mesma seta desenhada à direita — a nativa do navegador
 * varia de navegador para navegador e destoa do resto do formulário.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, id, disabled, children, ...props },
  ref,
) {
  const field = useField()
  const controlId = id ?? field?.controlId
  const invalid = props['aria-invalid'] === true || field?.invalid === true
  const errorId = controlId ? `${controlId}-erro` : undefined
  const hintId = controlId ? `${controlId}-dica` : undefined

  return (
    <div className="relative">
      <select
        ref={ref}
        id={controlId}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : hintId}
        className={cn(
          BASE,
          ESTADO[invalid ? 'erro' : 'neutro'],
          'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="text-neutral-500 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      >
        <path
          fillRule="evenodd"
          d="M5.3 7.7a1 1 0 0 1 1.4 0L10 11l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  )
})
