import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardTitle, PageHeader, Spinner, Table, useToast } from '../../components'
import type { TableColumn } from '../../components'
import { InscricaoForm } from './InscricaoForm'
import { rotaDosAlunos } from './rotas'
import { useLecionamentos, useSala } from './salas.hooks'
import type { Lecionamento } from './salas.tipos'

const ABA = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const ABA_ATIVA = 'bg-primary-50 text-primary-700'
const ABA_INATIVA = 'text-neutral-600 hover:bg-neutral-100'

/**
 * Detalhe da sala: quem leciona nela e, se o professor ainda não estiver
 * inscrito, o formulário para se inscrever.
 *
 * A inscrição é o que abre a porta da competição (Etapa 04), então a tela
 * separa os dois casos: já inscrito mostra o que ele leciona; não inscrito
 * mostra o formulário. A lista de lecionamentos vem sempre, porque a sala é
 * compartilhada e o professor precisa ver quem mais leciona nela para saber o
 * que a competição vai englobar.
 */
export function SalaDetailPage() {
  const { salaId } = useParams<{ salaId: string }>()
  const toast = useToast()

  const sala = useSala(salaId)
  const lecionamentos = useLecionamentos(salaId)

  function aoInscrever(lecionamento: Lecionamento) {
    lecionamentos.recarregar()
    sala.recarregar()
    toast.success(
      `Inscrição feita. Você leciona ${lecionamento.componentesCurriculares.length} componente(s) nesta sala.`,
    )
  }

  if (sala.carregando) {
    return (
      <>
        <PageHeader title="Sala" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando sala" />
          <span className="text-neutral-500 text-sm">Carregando a sala…</span>
        </div>
      </>
    )
  }

  if (sala.erro || !sala.dados) {
    return (
      <>
        <PageHeader title="Sala" />
        <Alert tone="erro" className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{sala.erro ?? 'Sala não encontrada.'}</span>
            <Link to="/salas">
              <Button variant="outline" size="sm">
                Voltar para as salas
              </Button>
            </Link>
          </div>
        </Alert>
      </>
    )
  }

  const dados = sala.dados
  const meu = dados.meuLecionamento

  return (
    <>
      <PageHeader
        title={dados.nome}
        description={`${dados.escola.nome} · ano letivo ${dados.anoLetivo}`}
        action={
          dados.id ? (
            <Link to={rotaDosAlunos(dados.id)}>
              <Button variant="secondary">Alunos</Button>
            </Link>
          ) : null
        }
      />

      <nav aria-label="Seções da sala" className="border-line mt-5 flex flex-wrap gap-1 border-b pb-3">
        <span className={ABA_INATIVA + ' px-3.5 py-2 text-sm font-semibold'}>
          Lecionamentos
        </span>
        <Link to={rotaDosAlunos(dados.id)} className={`${ABA} ${ABA_ATIVA}`}>
          Alunos
        </Link>
        {/*
         * A competição é criada por lecionamento (Etapa 04), e por isso a aba
         * ainda não existe. Fica visível e desabilitada para deixar claro que
         * a sala avança — sem um link que não vai a lugar nenhum.
         */}
        <span
          aria-disabled
          title="Chega na Etapa 04"
          className={`${ABA} cursor-not-allowed text-neutral-400`}
        >
          Competições
        </span>
      </nav>

      <div className="mt-6 space-y-6">
        {meu ? (
          <Card tone="primary" bar="left">
            <CardTitle className="flex flex-wrap items-center gap-2.5">
              Você leciona aqui
              <Badge tone="primary">
                {meu.componentesCurriculares.length}{' '}
                {meu.componentesCurriculares.length === 1 ? 'componente' : 'componentes'}
              </Badge>
            </CardTitle>
            <p className="text-neutral-600 mt-1.5 text-sm">
              {meu.componentesCurriculares.length > 0 ? (
                <>
                  Você leciona{' '}
                  <span className="text-neutral-800 font-medium">
                    {meu.componentesCurriculares.map((c) => c.nome).join(', ')}
                  </span>{' '}
                  nesta sala.
                </>
              ) : (
                'Sua inscrição não tem componentes curriculares registrados.'
              )}
            </p>
          </Card>
        ) : (
          <Card tone="accent" bar="left">
            <CardTitle>Ainda não leciona nesta sala</CardTitle>
            <p className="text-neutral-600 mt-1.5 mb-5 text-sm">
              A inscrição informa os componentes que você leciona aqui e é o que
              dá origem à competição da sala. Outro professor da mesma escola já
              pode estar inscrito — a lista abaixo mostra quem é.
            </p>
            <InscricaoForm salaId={dados.id} onInscrito={aoInscrever} />
          </Card>
        )}

        <section aria-labelledby="titulo-lecionamentos">
          <h2 id="titulo-lecionamentos" className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase">
            Lecionamentos
          </h2>

          <Card bare className="mt-2.5">
            {lecionamentos.erro ? (
              <div className="p-6">
                <Alert tone="erro">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{lecionamentos.erro}</span>
                    <Button variant="outline" size="sm" onClick={lecionamentos.recarregar}>
                      Tentar de novo
                    </Button>
                  </div>
                </Alert>
              </div>
            ) : (
              <Table
                columns={COLUNAS}
                rows={lecionamentos.dados ?? []}
                rowKey={(lecionamento) => lecionamento.id}
                loading={lecionamentos.carregando}
                emptyMessage="Nenhum professor inscrito nesta sala ainda."
              />
            )}
          </Card>
        </section>
      </div>
    </>
  )
}

const COLUNAS: TableColumn<Lecionamento>[] = [
  {
    key: 'professor',
    header: 'Professor',
    cell: (lecionamento) => (
      <span>
        <span className="font-medium text-neutral-800">{lecionamento.professor.nome}</span>
        <span className="text-neutral-500 block text-xs">
          {lecionamento.professor.codigoMatricula}
        </span>
      </span>
    ),
  },
  {
    key: 'componentes',
    header: 'Componentes curriculares',
    cell: (lecionamento) =>
      lecionamento.componentesCurriculares.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {lecionamento.componentesCurriculares.map((componente) => (
            <li key={componente.id}>
              <Badge tone="neutro">{componente.nome}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
  },
]
