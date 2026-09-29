import { Link } from 'react-router-dom'
import { rotaDaSala, rotaDasCompeticoes, rotaDosAlunos } from './rotas'

/** Seções da sala que têm tela própria. */
export type SecaoDaSala = 'lecionamentos' | 'alunos' | 'competicoes'

const ABA = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const ABA_ATIVA = 'bg-primary-50 text-primary-700'
const ABA_INATIVA = 'text-neutral-600 hover:bg-neutral-100'

const ABAS: Array<{ id: SecaoDaSala; rotulo: string }> = [
  { id: 'lecionamentos', rotulo: 'Lecionamentos' },
  { id: 'alunos', rotulo: 'Alunos' },
  { id: 'competicoes', rotulo: 'Competições' },
]

function caminhoDaSecao(secao: SecaoDaSala, salaId: string): string {
  if (secao === 'alunos') return rotaDosAlunos(salaId)
  if (secao === 'competicoes') return rotaDasCompeticoes(salaId)
  return rotaDaSala(salaId)
}

export interface AbasDaSalaProps {
  salaId: string
  /** Seção em que a pessoa está; é a que fica marcada como atual. */
  atual: SecaoDaSala
}

/**
 * Navegação entre as seções da sala.
 *
 * Nasceu na Etapa 04, quando a seção de competições passou a existir: as três
 * telas da sala precisam da mesma barra, e três cópias divergiriam no primeiro
 * ajuste de estilo. A seção atual é um `span` com `aria-current`, e não um link
 * para si mesma — um link que não navega é ruído para quem usa leitor de tela.
 */
export function AbasDaSala({ salaId, atual }: AbasDaSalaProps) {
  return (
    <nav aria-label="Seções da sala" className="border-line mt-5 flex flex-wrap gap-1 border-b pb-3">
      {ABAS.map((aba) =>
        aba.id === atual ? (
          <span key={aba.id} aria-current="page" className={`${ABA} ${ABA_ATIVA}`}>
            {aba.rotulo}
          </span>
        ) : (
          <Link key={aba.id} to={caminhoDaSecao(aba.id, salaId)} className={`${ABA} ${ABA_INATIVA}`}>
            {aba.rotulo}
          </Link>
        ),
      )}
    </nav>
  )
}
