import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { FieldContext } from './field-context'

export interface FieldProps {
  label: ReactNode
  /** Texto de erro. Quando presente, o controle é marcado como inválido. */
  error?: string
  /** Texto de apoio exibido abaixo do label ou abaixo do controle. */
  hint?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

/**
 * Casca de formulário: label, texto de erro e dica.
 *
 * Mantém o label e o controle amarrados por id e `htmlFor` gerados, para o
 * clique no rótulo focar o campo e o leitor de tela anunciar o erro junto.
 */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const controlId = useId()
  const invalid = Boolean(error)

  return (
    <FieldContext.Provider value={{ controlId, invalid }}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={controlId} className="text-sm font-medium text-neutral-700">
          {label}
          {required ? (
            <span aria-hidden className="text-accent-600 ml-0.5">
              *
            </span>
          ) : null}
        </label>

        {children}

        {error ? (
          <p id={`${controlId}-erro`} role="alert" className="text-accent-600 text-sm font-medium">
            {error}
          </p>
        ) : hint ? (
          <p id={`${controlId}-dica`} className="text-neutral-500 text-sm">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
