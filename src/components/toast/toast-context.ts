import { createContext, useContext } from 'react'

export type ToastTone = 'sucesso' | 'erro'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

export interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Acesso ao sistema de notificação. Lembre-se de que a Etapa 01 decidiu usar
 * implementação própria em vez de react-hot-toast: a necessidade é só sucesso
 * e erro, sem fila, sem promise, sem ação, e uma dependência a menos no
 * bundle. Se alguma tela exigir algo mais, aí sim vale trocar pela lib.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>.')
  }
  return context
}
