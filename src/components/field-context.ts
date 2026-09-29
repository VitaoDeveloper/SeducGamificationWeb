import { createContext, useContext } from 'react'

/**
 * Estado compartilhado entre o Field e o Input dentro dele: qual é o id do
 * controle e se há erro. Vive em arquivo próprio porque o Field.tsx precisa
 * exportar só componentes, senão o Fast Refresh do Vite para de funcionar.
 */
export interface FieldState {
  controlId: string
  invalid: boolean
}

export const FieldContext = createContext<FieldState | null>(null)

/** Id e estado de erro do Field mais próximo, ou null se estiver fora dele. */
export function useField(): FieldState | null {
  return useContext(FieldContext)
}
