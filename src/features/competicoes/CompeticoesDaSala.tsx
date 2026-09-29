import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardTitle, PageHeader, Spinner } from '../../components'
import { useAuth } from '../auth'
import { AbasDaSala } from '../salas/AbasDaSala'
import { useSala } from '../salas/salas.hooks'
import { useCompeticoesDaSala } from './competicoes.hooks'
import type { CompeticaoCompleta } from './competicoes.tipos'
import type { Lecionamento } from '../salas/salas.tipos'
import { NovaCompeticaoForm } from './NovaCompeticaoForm'
import { rotaDaCompeticao } from './rotas'

/**
 * Aba "Competições" da sala: as competições de cada lecionamento.
 *
 * A lista é por lecionamento, e não da sala inteira, porque a competição nasce
 * de um professor com seus componentes — a turma pode ter mais de uma, uma por
 * matéria. O professor vê as do colega, mas só cria nas suas: o botão só
 * aparece no lecionamento dele, que é quem tem autoridade para definir as datas.
 */
export function CompeticoesDaSala() {
  const { salaId } = useParams<{ salaId: string }>()
  const { usuario } = useAuth()

  const sala = useSala(salaId)
  const competicoes = useCompeticoesDaSala(salaId)

  const [criandoEm, setCriandoEm] = useState<string | null>(null)

  return (
    <>
      <PageHeader
        title="Competições"
        description={
          sala.dados ? `${sala.dados.nome} · ${sala.dados.escola.nome}` : 'Carregando a sala…'
        }
      />

      <AbasDaSala salaId={salaId ?? ''} atual="competicoes" />

      <div className="mt-6 space-y-8">
        {competicoes.erro ? (
          <Alert tone="erro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{competicoes.erro}</span>
              <Button variant="outline" size="sm" onClick={competicoes.recarregar}>
                Tentar de novo
              </Button>
            </div>
          </Alert>
        ) : null}

        {competicoes.carregando ? (
          <div className="flex items-center justify-center gap-2.5 py-16">
            <Spinner label="Carregando competições" />
            <span className="text-neutral-500 text-sm">Carregando as competições…</span>
          </div>
        ) : (competicoes.dados?.length ?? 0) === 0 ? (
          <Card bare>
            <p className="text-neutral-500 px-6 py-12 text-center text-sm">
              Nenhum professor está inscrito nesta sala ainda. A competição nasce
              da inscrição, com os componentes que cada um leciona.
            </p>
          </Card>
        ) : (
          (competicoes.dados ?? []).map(({ lecionamento, competicoes: daqueleProfessor }) => (
            <SecaoDoLecionamento
              key={lecionamento.id}
              lecionamento={lecionamento}
              competicoes={daqueleProfessor}
              minha={lecionamento.professorId === usuario?.id}
              criando={criandoEm === lecionamento.id}
              onAbrirCriacao={() => setCriandoEm(lecionamento.id)}
              onFecharCriacao={() => setCriandoEm(null)}
              onCriada={() => {
                setCriandoEm(null)
                competicoes.recarregar()
              }}
            />
          ))
        )}
      </div>
    </>
  )
}

function SecaoDoLecionamento({
  lecionamento,
  competicoes,
  minha,
  criando,
  onAbrirCriacao,
  onFecharCriacao,
  onCriada,
}: {
  lecionamento: Lecionamento
  competicoes: CompeticaoCompleta[]
  minha: boolean
  criando: boolean
  onAbrirCriacao: () => void
  onFecharCriacao: () => void
  onCriada: () => void
}) {
  const componentes = lecionamento.componentesCurriculares.map((item) => item.nome)

  return (
    <section aria-label={`Competições de ${lecionamento.professor.nome}`} className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-800">
            {lecionamento.professor.nome}
          </h2>
          <p className="text-neutral-500 text-sm">
            {componentes.length > 0
              ? componentes.join(', ')
              : 'Nenhum componente curricular registrado.'}
          </p>
        </div>

        {minha && !criando ? (
          <Button onClick={onAbrirCriacao}>Nova competição</Button>
        ) : null}
      </div>

      {criando ? (
        <NovaCompeticaoForm
          lecionamentoId={lecionamento.id}
          onCriada={onCriada}
          onCancelar={onFecharCriacao}
        />
      ) : null}

      {competicoes.length === 0 ? (
        <Card bare>
          <p className="text-neutral-500 px-6 py-8 text-center text-sm">
            {minha
              ? 'Você ainda não criou uma competição para esta turma.'
              : 'Nenhuma competição deste professor nesta sala ainda.'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {competicoes.map((competicao) => (
            <Card key={competicao.id}>
              <CardTitle>{competicao.nome}</CardTitle>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge tone="neutro">
                  {competicao.bimestres.length}{' '}
                  {competicao.bimestres.length === 1 ? 'bimestre' : 'bimestres'}
                </Badge>
                <Badge tone="neutro">
                  {competicao.gruposCompetidores.length}{' '}
                  {competicao.gruposCompetidores.length === 1 ? 'grupo' : 'grupos'}
                </Badge>
              </div>

              <div className="mt-4">
                <Link to={rotaDaCompeticao(competicao.id)}>
                  <Button variant="outline" size="sm">
                    Abrir competição
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
