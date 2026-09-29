import { Field, Select } from '../../components'
import { rotuloDoBimestre } from './bimestres'
import type { Bimestre } from './competicoes.tipos'

export interface SelecaoDeBimestreProps {
  bimestres: Bimestre[]
  /** Id do bimestre em exibição; vazio enquanto a escolha automática não rodou. */
  valor: string | undefined
  onChange: (bimestreId: string) => void
  disabled?: boolean
}

/**
 * Seletor de "qual bimestre estou vendo".
 *
 * Fica em componente próprio porque é o eixo da competição inteira: os grupos
 * mudam por bimestre (Etapa 04) e as próximas etapas — pontuação, lançamentos e
 * rankings (05 e 06) — vão pendurar a mesma pergunta na tela. Uma cópia por
 * página faria cada uma divergir na ordem ou no rótulo dos bimestres.
 *
 * A ordem é a do número, e não a que veio da API: a API já devolve em ordem,
 * mas ordenar aqui custa nada e deixa o componente independente do servidor.
 */
export function SelecaoDeBimestre({
  bimestres,
  valor,
  onChange,
  disabled = false,
}: SelecaoDeBimestreProps) {
  const ordenados = [...bimestres].sort((a, b) => a.numero - b.numero)

  return (
    <Field label="Bimestre" className="max-w-xs">
      <Select
        value={valor ?? ''}
        onChange={(evento) => onChange(evento.target.value)}
        disabled={disabled || ordenados.length === 0}
      >
        {ordenados.length === 0 ? <option value="">Sem bimestres</option> : null}
        {ordenados.map((bimestre) => (
          <option key={bimestre.id} value={bimestre.id}>
            {rotuloDoBimestre(bimestre.numero)}
          </option>
        ))}
      </Select>
    </Field>
  )
}
