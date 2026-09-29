import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, PageHeader, Spinner, Table, useToast } from '../../components'
import type { TableColumn } from '../../components'
import { NovaSalaForm } from './NovaSalaForm'
import { rotaDaSala } from './rotas'
import { useSalasAgrupadasPorEscola } from './salas.hooks'
import type { SalaDoProfessor } from './salas.hooks'
import type { Sala } from './salas.tipos'

/**
 * Tela inicial do professor: as salas das escolas em que ele atua.
 *
 * A lista não é "minhas salas". Salas são compartilhadas na escola, e o que
 * muda de professor para professor é quem leciona em qual delas — daí a marca
 * "Você leciona aqui" e o convite a se inscrever nas outras. Como um professor
 * pode atuar em mais de uma escola (RN27), a lista é agrupada por escola, senão
 * duas turmas de nomes parecidos de escolas diferentes ficariam vizinhas sem
 * nenhuma pista de onde cada uma é.
 */
export function SalasListPage() {
  const { carregando, erro, recarregar, grupos } = useSalasAgrupadasPorEscola()
  const [criando, setCriando] = useState(false)
  const toast = useToast()

  /*
   * As escolas oferecidas no formulário saem das salas que já vieram na
   * listagem. Não há endpoint de escolas vinculadas ao professor: o vínculo é
   * feito pelo mantenedor, direto no banco, e `GET /salas` é a única resposta
   * que traz `escola` com nome.
   */
  const escolas = useMemo(() => {
    const vistas = new Map<string, { id: string; nome: string }>()
    for (const grupo of grupos) vistas.set(grupo.escola.id, grupo.escola)
    return [...vistas.values()]
  }, [grupos])

  function aoCriarSala(sala: Sala) {
    setCriando(false)
    // A sala acabou de ser criada e o professor precisa vê-la na lista sem
    // esperar um F5 — e marcada como "disponível para inscrição", porque criar
    // a turma não inscreve ninguém nela.
    recarregar()
    toast.success(`Sala ${sala.nome} criada. Inscreva-se nela para lecionar.`)
  }

  return (
    <>
      <PageHeader
        title="Salas"
        description="Turmas das escolas em que você atua. Salas são compartilhadas: você se inscreve nas que leciona."
        action={
          criando ? null : (
            <Button onClick={() => setCriando(true)}>Nova sala</Button>
          )
        }
      />

      <div className="mt-6 space-y-8">
        {criando ? (
          <NovaSalaForm
            escolas={escolas}
            onCriada={aoCriarSala}
            onCancelar={() => setCriando(false)}
          />
        ) : null}

        {erro ? (
          <Alert tone="erro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{erro}</span>
              <Button variant="outline" size="sm" onClick={recarregar}>
                Tentar de novo
              </Button>
            </div>
          </Alert>
        ) : null}

        {carregando ? (
          <div className="flex items-center justify-center gap-2.5 py-16">
            <Spinner label="Carregando salas" />
            <span className="text-neutral-500 text-sm">Carregando salas…</span>
          </div>
        ) : null}

        {!carregando && !erro && grupos.length === 0 ? (
          <Card tone="neutral" className="max-w-2xl">
            <h2 className="text-lg font-semibold">Nenhuma sala por aqui</h2>
            <p className="text-neutral-600 mt-1.5 text-sm">
              Assim que você criar a primeira sala, ela aparece aqui — e os
              professores da mesma escola passa a vê-la e a se inscrever.
            </p>
            {!criando ? (
              <Button onClick={() => setCriando(true)} className="mt-5">
                Criar a primeira sala
              </Button>
            ) : null}
          </Card>
        ) : null}

        {grupos.map((grupo) => (
          <section key={grupo.escola.id} aria-labelledby={`escola-${grupo.escola.id}`}>
            <h2
              id={`escola-${grupo.escola.id}`}
              className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
            >
              {grupo.escola.nome}
            </h2>

            <Card bare className="mt-2.5">
              <Table
                columns={COLUNAS}
                rows={grupo.salas}
                rowKey={(sala) => sala.id}
                emptyMessage="Nenhuma sala nesta escola."
              />
            </Card>
          </section>
        ))}
      </div>
    </>
  )
}

const COLUNAS: TableColumn<SalaDoProfessor>[] = [
  {
    key: 'nome',
    header: 'Sala',
    cell: (sala) => (
      <Link
        to={rotaDaSala(sala.id)}
        className="text-primary-700 hover:text-primary-800 font-medium underline-offset-2 hover:underline"
      >
        {sala.nome}
      </Link>
    ),
  },
  {
    key: 'anoLetivo',
    header: 'Ano letivo',
    cell: (sala) => sala.anoLetivo,
    hideBelow: 'md',
  },
  {
    key: 'situacao',
    header: 'Sua situação',
    cell: (sala) =>
      sala.meuLecionamento ? (
        <Badge tone="primary">Você leciona aqui</Badge>
      ) : (
        <Badge tone="neutro">Disponível para inscrição</Badge>
      ),
  },
]
