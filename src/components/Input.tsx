import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'
import { useField } from './field-context'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Rótulo visual flutuante. Sem ele, o campo fica sem texto algum. */
  label?: string
  /** Prefixo à esquerda, para unidade ou máscara (ex.: "kg", "R$"). */
  prefix?: string
}

const BASE =
  'w-full rounded-lg border bg-surface px-3.5 py-2.5 text-sm text-neutral-800 ' +
  'placeholder:text-neutral-400 transition-colors ' +
  'focus:outline-none focus-visible:outline-none'

const ESTADO = {
  neutro: 'border-line-strong focus:border-primary-600 focus:ring-2 focus:ring-primary-200',
  erro:
    'border-accent-600 focus:border-accent-600 focus:ring-2 ' +
    'focus:ring-accent-200',
} as const

/**
 * Campo de texto.
 *
 * A borda em repouso usa `--color-line-strong` e não `--color-line`: a borda é
 * o que identifica o controle, então precisa de 3:1 (WCAG 1.4.11), e
 * `--color-line` fica em 1.26:1 sobre branco. Ver src/styles/tokens.css.
 *
 * Dentro de um Field, o id e o estado de erro vêm do contexto; fora dele, o
 * campo continua funcionando, sem rótulo e sem erro.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, prefix, className, id, disabled, ...props },
  ref,
) {
  const field = useField()
  const controlId = id ?? field?.controlId
  const invalid = props['aria-invalid'] === true || field?.invalid === true
  const errorId = controlId ? `${controlId}-erro` : undefined
  const hintId = controlId ? `${controlId}-dica` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', label && 'w-full')}>
      {label ? (
        <label htmlFor={controlId} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {prefix ? (
          <span className="text-neutral-500 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm">
            {prefix}
          </span>
        ) : null}
        <input
          ref={ref}
          id={controlId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : hintId}
          className={cn(
            BASE,
            ESTADO[invalid ? 'erro' : 'neutro'],
            'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
            prefix && 'pl-10',
            className,
          )}
          {...props}
        />
      </div>
    </div>
  )
})
