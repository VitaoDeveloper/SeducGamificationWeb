import { forwardRef, useRef, useState } from 'react'
import type { InputHTMLAttributes, KeyboardEvent, Ref, RefObject } from 'react'
import { cn } from '../lib/cn'
import { useField } from './field-context'

export interface TagsInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string[]
  onValueChange: (value: string[]) => void
}

/**
 * Separadores que viram tag, e não parte do nome da matéria.
 *
 * Vírgula e ponto e vírgula entram porque são o que o professor digita na
 * impaciência; Enter é o que a interface anuncia. A barra não entra, porque
 * pode fazer parte de um nome ("Sistemas/Redes").
 */
const SEPARADORES = /[,;]/

/**
 * Campo de componentes curriculares, digitados como etiquetas.
 *
 * A matrícula da sala na Etapa 03 é "todos os componentes que o professor leciona
 * nela" (RN3), e a lista é curta e nomeada livremente — o professor é quem sabe
 * chamar a matéria na sua escola. Um select só faria sentido com uma lista
 * fechada, que não existe na API. Então o campo aceita texto livre e vira
 * etiqueta: cada `Enter` fecha uma matéria, e dá para remover sem refazer tudo.
 *
 * Acessibilidade: as etiquetas são uma lista com `role="list"`, e cada remoção
 * é um botão com nome próprio ("Remover Programação"), para o leitor de tela não
 * anunciar três botões idênticos. `Backspace` no campo vazio desfaz a última,
 * que é o que se espera de um campo que se preenche com o teclado.
 */
export const TagsInput = forwardRef<HTMLInputElement, TagsInputProps>(function TagsInput(
  { value, onValueChange, className, id, onKeyDown, onBlur, ...props },
  ref,
) {
  const field = useField()
  const controlId = id ?? field?.controlId
  const invalid = props['aria-invalid'] === true || field?.invalid === true
  const errorId = controlId ? `${controlId}-erro` : undefined
  const hintId = controlId ? `${controlId}-dica` : undefined

  const [texto, setTexto] = useState('')
  const interno = useRef<HTMLInputElement>(null)

  function adicionar(entrada: string) {
    const novas = entrada
      .split(SEPARADORES)
      .map((parte) => parte.trim())
      .filter(Boolean)
      // A API deduplica, mas mostrar duas etiquetas iguais antes de enviar
      // denuncia ao professor que a tela aceitou algo que ele não digitou.
      .filter((parte) => !value.includes(parte))

    if (novas.length === 0) {
      setTexto('')
      return
    }

    onValueChange([...value, ...novas])
    setTexto('')
  }

  function remover(etiqueta: string) {
    onValueChange(value.filter((item) => item !== etiqueta))
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(evento)
    if (evento.defaultPrevented) return

    if (evento.key === 'Enter') {
      evento.preventDefault()
      if (texto.trim()) adicionar(texto)
      return
    }

    if (evento.key === 'Backspace' && texto === '' && value.length > 0) {
      evento.preventDefault()
      remover(value[value.length - 1] as string)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-lg border bg-surface p-2 transition-colors',
        invalid
          ? 'border-accent-600 focus-within:ring-2 focus-within:ring-accent-200'
          : 'border-line-strong focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-200',
        className,
      )}
      onClick={() => interno.current?.focus()}
    >
      {value.map((etiqueta) => (
        <span
          key={etiqueta}
          className="bg-primary-50 text-primary-700 inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-2.5 text-sm font-medium"
        >
          {etiqueta}
          <button
            type="button"
            onClick={() => remover(etiqueta)}
            aria-label={`Remover ${etiqueta}`}
            className="text-primary-700 hover:bg-primary-200 rounded-full p-0.5 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-3.5">
              <path d="M6.3 6.3a1 1 0 0 1 1.4 0L10 8.6l2.3-2.3a1 1 0 1 1 1.4 1.4L11.4 10l2.3 2.3a1 1 0 1 1-1.4 1.4L10 11.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L8.6 10 6.3 7.7a1 1 0 0 1 0-1.4Z" />
            </svg>
          </button>
        </span>
      ))}

      <input
        ref={mergeRefs(ref, interno)}
        id={controlId}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={aoTeclar}
        onBlur={(evento) => {
          // O que sobrou no campo ao sair também vira etiqueta: professor que
          // digita a última matéria e clica no botão de salvar sem apertar Enter
          // não deve perder a matéria.
          if (texto.trim()) adicionar(texto)
          onBlur?.(evento)
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : hintId}
        className="placeholder:text-neutral-400 min-w-40 flex-1 bg-transparent px-1.5 py-1 text-sm text-neutral-800 focus:outline-none"
        {...props}
      />
    </div>
  )
})

/** Junta o `ref` de quem usa o componente com o interno, sem sobrescrever nenhum. */
function mergeRefs<T>(externo: Ref<T> | undefined, interno: RefObject<T | null>) {
  return (valor: T | null) => {
    interno.current = valor
    if (typeof externo === 'function') externo(valor)
    else if (externo) externo.current = valor
  }
}
