/**
 * Ícones de ação das linhas de listagem, desenhados no mesmo traço da
 * interface.
 *
 * Ficam em um arquivo próprio porque a edição e a exclusão de linha se repetem
 * em toda listagem do sistema (sala, aluno, matéria), e dois SVGs soltos em um
 * arquivo de componente sem base no design-system.
 */
export function IconeDeEdicao() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
      <path d="M12.92 3.74a1.75 1.75 0 0 1 2.48 2.47l-7.9 7.91a1.5 1.5 0 0 1-.7.41l-2.85.86a.5.5 0 0 1-.62-.62l.87-2.84a1.5 1.5 0 0 1 .4-.7l8.32-8.49Z" />
    </svg>
  )
}

export function IconeDeLixeira() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-4">
      <path
        fillRule="evenodd"
        d="M7 2.25A1.75 1.75 0 0 1 8.75.5h2.5A1.75 1.75 0 0 1 13 2.25v.5h3.25a.75.75 0 0 1 0 1.5h-.45l-.74 11.36a2.75 2.75 0 0 1-2.74 2.54H7.68a2.75 2.75 0 0 1-2.74-2.54L4.2 4.25h-.45a.75.75 0 0 1 0-1.5H7v-.5ZM8.75 2v.5h2.5V2a.25.25 0 0 0-.25-.25h-2a.25.25 0 0 0-.25.25Zm-2.1 12.36A1.25 1.25 0 0 0 7.9 15.5h4.2a1.25 1.25 0 0 0 1.25-1.14l.72-10.86H5.93l.72 10.86Zm2.1-8.86a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Zm3 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5a.75.75 0 0 1 .75-.75Z"
        clipRule="evenodd"
      />
    </svg>
  )
}