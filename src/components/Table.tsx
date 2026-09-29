import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Spinner } from './Spinner'

export interface TableColumn<T> {
  key: string
  header: ReactNode
  /** Célula da linha. Recebe a linha inteira para acessar campos aninhados. */
  cell: (row: T) => ReactNode
  /** Alinhamento do conteúdo da coluna. */
  align?: 'left' | 'right' | 'center'
  /** Oculta a coluna em telas estreitas. */
  hideBelow?: 'md' | 'lg'
  className?: string
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  /** Mensagem quando não há linhas. Sem ela, usa uma genérica. */
  emptyMessage?: string
  /** Segunda linha do estado vazio, com a ação para sair dele. */
  emptyAction?: ReactNode
  className?: string
}

const OCULTAR = {
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const

const ALINHAMENTO = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

/**
 * Tabela de listagens, com os três estados que toda tela de dados precisa:
 * carregando, vazia e com conteúdo.
 *
 * Em carregamento, mantém o cabeçalho na tela e preenche as linhas com
 * esqueleto, para a página não pular de altura quando os dados chegarem.
 */
export function Table<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'Nada por aqui ainda.',
  emptyAction,
  className,
}: TableProps<T>) {
  const semDados = !loading && rows.length === 0

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-line border-b">
            {columns.map((coluna) => (
              <th
                key={coluna.key}
                scope="col"
                className={cn(
                  'text-neutral-500 px-4 py-3 text-xs font-semibold tracking-wide uppercase',
                  coluna.hideBelow && OCULTAR[coluna.hideBelow],
                  ALINHAMENTO[coluna.align ?? 'left'],
                  coluna.className,
                )}
              >
                {coluna.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading
            ? Array.from({ length: 3 }, (_, indice) => (
                <tr key={`esqueleto-${indice}`} className="border-line border-b last:border-0">
                  {columns.map((coluna) => (
                    <td
                      key={coluna.key}
                      className={cn('px-4 py-3.5', coluna.hideBelow && OCULTAR[coluna.hideBelow])}
                    >
                      <span className="bg-neutral-200 block h-3.5 w-full animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            : null}

          {!loading && rows.length > 0
            ? rows.map((linha) => (
                <tr key={rowKey(linha)} className="border-line hover:bg-neutral-50 border-b last:border-0">
                  {columns.map((coluna) => (
                    <td
                      key={coluna.key}
                      className={cn(
                        'text-neutral-700 px-4 py-3.5 align-middle',
                        coluna.hideBelow && OCULTAR[coluna.hideBelow],
                        ALINHAMENTO[coluna.align ?? 'left'],
                        coluna.className,
                      )}
                    >
                      {coluna.cell(linha)}
                    </td>
                  ))}
                </tr>
              ))
            : null}
        </tbody>
      </table>

      {semDados ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <p className="text-neutral-500 text-sm">{emptyMessage}</p>
          {emptyAction}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2.5 px-6 py-10">
          <Spinner size="sm" />
          <span className="text-neutral-500 text-sm">Carregando…</span>
        </div>
      ) : null}
    </div>
  )
}
