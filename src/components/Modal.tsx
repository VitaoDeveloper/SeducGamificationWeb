import { useCallback, useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  /** Ações do rodapé, normalmente botões. */
  footer?: ReactNode
  /** Largura máxima do cartão. */
  size?: 'sm' | 'md'
}

const LARGURAS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
} as const

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal.
 *
 * Aparece pela primeira vez na Etapa 03, no cadastro de aluno: o professor
 * precisa ler e copiar o código de matrícula antes de fechar, e esse dado não
 * volta a aparecer em lugar nenhum da interface — a listagem mostra o código,
 * mas a tela de cadastro é a única que pode dizer que a senha inicial é ele.
 *
 * Não há biblioteca de diálogo no projeto. O que o `dialog` nativo faria por
 * conta própria (esc para fechar, foco preso dentro, foco no primeiro
 * elemento) é o mínimo que este componente faz à mão, mais o `inert` de fundo
 * via `aria-hidden`, para o leitor de tela não vazar para a página atrás.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'sm' }: ModalProps) {
  const cartao = useRef<HTMLDivElement>(null)
  const anterior = useRef<HTMLElement | null>(null)
  const tituloId = useId()
  const descricaoId = useId()

  const focarPrimeiro = useCallback(() => {
    const alvo = cartao.current?.querySelector<HTMLElement>(FOCAVEIS)
    ;(alvo ?? cartao.current)?.focus()
  }, [])

  /*
   * Foco: guarda quem abriu o diálogo, leva o foco para dentro e, ao fechar,
   * devolve. A ordem importa — capturar o elemento ativo depois de `focarPrimeiro`
   * guardaria o próprio controle do modal, e o foco voltaria para o nada.
   */
  useEffect(() => {
    if (!open) return

    anterior.current = document.activeElement as HTMLElement | null
    focarPrimeiro()

    return () => {
      anterior.current?.focus?.()
      anterior.current = null
    }
  }, [open, focarPrimeiro])

  /*
   * Teclado: Esc fecha e Tab fica preso no cartão. Em efeito separado do foco
   * porque depende de `onClose`, que quem usa costuma passar como arrow nova a
   * cada render — junto, cada render reposicionaria o foco para o começo.
   */
  useEffect(() => {
    if (!open) return

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        onClose()
        return
      }

      if (evento.key !== 'Tab') return

      // O foco não pode escapar do cartão: Tab no último elemento volta para o
      // primeiro, e Shift+Tab no primeiro vai para o último.
      const focaveis = Array.from(cartao.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])
      if (focaveis.length === 0) {
        evento.preventDefault()
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (!primeiro || !ultimo) return

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar, true)
    return () => document.removeEventListener('keydown', aoTeclar, true)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-neutral-900/45 backdrop-blur-[2px]"
      />

      <div
        ref={cartao}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={description ? descricaoId : undefined}
        tabIndex={-1}
        className={cn(
          'bg-surface shadow-pop relative w-full rounded-card p-6 focus:outline-none',
          LARGURAS[size],
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 absolute top-4 right-4 rounded-md p-1 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-5">
            <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 1 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>

        <h2 id={tituloId} className="pr-8 text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <p id={descricaoId} className="text-neutral-600 mt-1.5 text-sm">
            {description}
          </p>
        ) : null}

        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
