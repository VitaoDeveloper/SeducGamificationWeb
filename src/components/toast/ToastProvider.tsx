import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ToastContext } from './toast-context'
import type { Toast, ToastTone } from './toast-context'

/** Erro fica mais tempo na tela que sucesso, porque exige leitura. */
const DURACAO_MS: Record<ToastTone, number> = {
  sucesso: 5000,
  erro: 9000,
}

const ESTILO: Record<ToastTone, { barra: string; icone: string; cor: string }> = {
  sucesso: {
    barra: 'bg-primary-500',
    icone: 'text-primary-600',
    cor: 'text-primary-600',
  },
  erro: {
    barra: 'bg-accent-600',
    icone: 'text-accent-600',
    cor: 'text-accent-600',
  },
}

function Icone({ tone }: { tone: ToastTone }) {
  if (tone === 'sucesso') {
    return (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-5 shrink-0">
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-5 shrink-0">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0V7Zm-1 7.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const fechar = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const mostrar = useCallback(
    (tone: ToastTone, message: string) => {
      const id = proximoId.current++
      setToasts((atuais) => [...atuais, { id, tone, message }])
      timers.current.set(
        id,
        setTimeout(() => fechar(id), DURACAO_MS[tone]),
      )
    },
    [fechar],
  )

  // Evita vazar timers se o provider desmontar com toasts na tela.
  useEffect(() => {
    const pendentes = timers.current
    return () => {
      for (const timer of pendentes.values()) clearTimeout(timer)
      pendentes.clear()
    }
  }, [])

  const valor = useMemo(
    () => ({
      success: (message: string) => mostrar('sucesso', message),
      error: (message: string) => mostrar('erro', message),
    }),
    [mostrar],
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'erro' ? 'alert' : 'status'}
            className="bg-surface border-line shadow-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border py-3.5 pr-3 pl-4"
          >
            <span
              aria-hidden
              className={cn('absolute inset-y-0 left-0 w-1.5', ESTILO[toast.tone].barra)}
            />
            <span className={cn('mt-0.5', ESTILO[toast.tone].icone)}>
              <Icone tone={toast.tone} />
            </span>
            <p className="text-neutral-800 min-w-0 flex-1 text-sm">{toast.message}</p>
            <button
              type="button"
              onClick={() => fechar(toast.id)}
              aria-label="Fechar notificação"
              className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 -mr-0.5 rounded-md p-1 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
                <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 0 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
