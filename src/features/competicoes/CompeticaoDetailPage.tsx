import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardTitle,
  PageHeader,
  Spinner,
  useToast,
} from '../../components'
import { formatarData, rotuloDoBimestre } from './bimestres'
import { useCompeticao, useGrupos, useSalaDoLecionamento } from './competicoes.hooks'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre, GrupoComMembros } from './competicoes.tipos'
import { GerenciarMembros } from './GerenciarMembros'
import { NovoGrupoForm } from './NovoGrupoForm'
import { SelecaoDeBimestre } from './SelecaoDeBimestre'
import { rotaDasCompeticoes } from '../salas/rotas'
import { useAlunos } from '../salas/salas.hooks'

const ABA = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const ABA_ATIVA = 'bg-primary-50 text-primary-700'

/**
 * Abas da competição, já com as que as próximas etapas vão preencher.
 *
 * A navegação nasce agora, na Etapa 04, porque a tela vai crescer: pontuação,
 * lançamentos e rankings penduram-se no mesmo "qual bimestre estou vendo". Deixar
 * as abas futuras visíveis e desabilitadas evita que a página pareça pronta e
 * depois se reorganize inteira quando a próxima etapa chegar.
 */
const ABAS = [
  { id: 'grupos', rotulo: 'Grupos', pronta: true, etapa: '' },
  { id: 'componentes', rotulo: 'Componentes', pronta: false, etapa: 'Chega na Etapa 05' },
  { id: 'lancamentos', rotulo: 'Lançamentos', pronta: false, etapa: 'Chega na Etapa 05' },
  { id: 'rankings', rotulo: 'Rankings', pronta: false, etapa: 'Chega na Etapa 06' },
] as const

/**
 * Detalhe da competição: os quatro bimestres, os grupos e quem está em cada um.
 *
 * A página inteira gira em torno do bimestre selecionado, e por isso a escolha
 * dele é o primeiro controle depois do cabeçalho: no primeiro carregamento a
 * tela abre no bimestre aberto mais recente — o que o professor está montando
 * agora — e, sem nenhum aberto, no primeiro, para não abrir vazia.
 */
export function CompeticaoDetailPage() {
  const { competicaoId } = useParams<{ competicaoId: string }>()
  const toast = useToast()

  const competicao = useCompeticao(competicaoId)
  const [bimestreEscolhido, setBimestreEscolhido] = useState<string>()

  const bimestres = competicao.dados?.bimestres ?? []

  /*
   * O bimestre padrão é o aberto mais recente — o que o professor está montando
   * agora — e, sem nenhum aberto, o primeiro. É derivado no render, e não
   * guardado num efeito: assim que a competição chega, a conta já vale, sem um
   * render a mais e sem estado que possa divergir dos dados.
   */
  const aberto = [...bimestres]
    .sort((a, b) => b.numero - a.numero)
    .find((bimestre) => bimestre.situacao === SITUACAO_BIMESTRE.ABERTO)
  const bimestreId = bimestreEscolhido ?? (aberto ?? bimestres[0])?.id

  // Só busca os grupos quando já há um bimestre escolhido: a escolha padrão sai
  // dos próprios bimestres que a competição trouxe, e pedir os grupos antes
  // disso seria uma requisição a mais que a tela ainda não sabe usar.
  const grupos = useGrupos(bimestreId ? competicaoId : undefined, bimestreId)

  const sala = useSalaDoLecionamento(competicao.dados?.lecionamentoId)
  const alunos = useAlunos(sala.dados?.id)

  const bimestreAtual = bimestres.find((bimestre) => bimestre.id === bimestreId)
  const encerrado = bimestreAtual?.situacao === SITUACAO_BIMESTRE.ENCERRADO
  const listaDeGrupos = grupos.dados?.grupos ?? []

  function aoMudarGrupos() {
    grupos.recarregar()
  }

  if (competicao.carregando) {
    return (
      <>
        <PageHeader title="Competição" />
        <div className="flex items-center justify-center gap-2.5 py-16">
          <Spinner label="Carregando competição" />
          <span className="text-neutral-500 text-sm">Carregando a competição…</span>
        </div>
      </>
    )
  }

  if (competicao.erro || !competicao.dados) {
    return (
      <>
        <PageHeader title="Competição" />
        <Alert tone="erro" className="mt-6 max-w-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{competicao.erro ?? 'Competição não encontrada.'}</span>
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

  const dados = competicao.dados

  return (
    <>
      <PageHeader
        title={dados.nome}
        description={
          sala.dados
            ? `${sala.dados.nome} · ${sala.dados.escola.nome}`
            : 'Competição da sala'
        }
        action={
          sala.dados ? (
            <Link to={rotaDasCompeticoes(sala.dados.id)}>
              <Button variant="outline">Competições da sala</Button>
            </Link>
          ) : null
        }
      />

      <nav
        aria-label="Seções da competição"
        className="border-line mt-5 flex flex-wrap gap-1 border-b pb-3"
      >
        {ABAS.map((aba) =>
          aba.pronta ? (
            <span key={aba.id} aria-current="page" className={`${ABA} ${ABA_ATIVA}`}>
              {aba.rotulo}
            </span>
          ) : (
            <span
              key={aba.id}
              aria-disabled
              title={aba.etapa}
              className={`${ABA} cursor-not-allowed text-neutral-400`}
            >
              {aba.rotulo}
            </span>
          ),
        )}
      </nav>

      <div className="mt-6 space-y-6">
        <Card bare>
          <div className="border-line border-b px-6 py-4">
            <h2 className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase">
              Bimestres
            </h2>
          </div>
          <ul className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {bimestres.map((bimestre) => (
              <li key={bimestre.id}>
                <BlocoDeBimestre bimestre={bimestre} />
              </li>
            ))}
          </ul>
        </Card>

        <SelecaoDeBimestre
          bimestres={bimestres}
          valor={bimestreId}
          onChange={setBimestreEscolhido}
        />

        {grupos.erro ? (
          <Alert tone="erro">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{grupos.erro}</span>
              <Button variant="outline" size="sm" onClick={grupos.recarregar}>
                Tentar de novo
              </Button>
            </div>
          </Alert>
        ) : null}

        <section aria-labelledby="titulo-grupos" className="space-y-3">
          <h2
            id="titulo-grupos"
            className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
          >
            Grupos
          </h2>

          <Card tone="accent" bar="left">
            <CardTitle>Novo grupo</CardTitle>
            <p className="text-neutral-600 mt-1.5 mb-4 text-sm">
              O grupo é a equipe que representa a turma na competição. Depois de
              criado, você distribui os alunos em cada bimestre.
            </p>
            <NovoGrupoForm
              competicaoId={dados.id}
              onCriado={() => {
                toast.success('Grupo criado.')
                aoMudarGrupos()
              }}
            />
          </Card>

          {grupos.carregando ? (
            <div className="flex items-center justify-center gap-2.5 py-10">
              <Spinner size="sm" />
              <span className="text-neutral-500 text-sm">Carregando grupos…</span>
            </div>
          ) : listaDeGrupos.length === 0 ? (
            <Card bare>
              <p className="text-neutral-500 px-6 py-10 text-center text-sm">
                Nenhum grupo nesta competição ainda. Crie o primeiro acima.
              </p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {listaDeGrupos.map((grupo) => (
                <CartaoDeGrupo key={grupo.id} grupo={grupo} />
              ))}
            </div>
          )}
        </section>

        {bimestreAtual ? (
          <section aria-labelledby="titulo-composicao" className="space-y-3">
            <h2
              id="titulo-composicao"
              className="text-neutral-600 font-display text-sm font-semibold tracking-wide uppercase"
            >
              Integrantes no {rotuloDoBimestre(bimestreAtual.numero)}
            </h2>

            <Card bare className="p-6">
              {alunos.erro ? (
                <Alert tone="erro">{alunos.erro}</Alert>
              ) : alunos.carregando ? (
                <div className="flex items-center justify-center gap-2.5 py-4">
                  <Spinner size="sm" />
                  <span className="text-neutral-500 text-sm">Carregando alunos…</span>
                </div>
              ) : (
                <GerenciarMembros
                  bimestreId={bimestreAtual.id}
                  encerrado={encerrado}
                  grupos={listaDeGrupos}
                  alunos={alunos.dados ?? []}
                  onAlterado={aoMudarGrupos}
                />
              )}
            </Card>
          </section>
        ) : null}
      </div>
    </>
  )
}

function BlocoDeBimestre({ bimestre }: { bimestre: Bimestre }) {
  const aberto = bimestre.situacao === SITUACAO_BIMESTRE.ABERTO

  return (
    <div className="border-line rounded-lg border p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-700">
          {rotuloDoBimestre(bimestre.numero)}
        </span>
        <Badge tone={aberto ? 'primary' : 'neutro'}>{aberto ? 'Aberto' : 'Encerrado'}</Badge>
      </div>
      <p className="text-neutral-500 mt-1.5 text-xs">
        {formatarData(bimestre.dataInicio)} a {formatarData(bimestre.dataFim)}
      </p>
    </div>
  )
}

function CartaoDeGrupo({ grupo }: { grupo: GrupoComMembros }) {
  return (
    <Card>
      <CardTitle className="flex flex-wrap items-center gap-2.5">
        {grupo.nome}
        <Badge tone="neutro">
          {grupo.membrosGrupos.length}{' '}
          {grupo.membrosGrupos.length === 1 ? 'integrante' : 'integrantes'}
        </Badge>
      </CardTitle>

      {grupo.membrosGrupos.length > 0 ? (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {grupo.membrosGrupos.map((membro) => (
            <li key={membro.alunoId}>
              <Badge tone="primary">{membro.aluno.nome}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-neutral-500 mt-2 text-sm">Nenhum integrante neste bimestre.</p>
      )}
    </Card>
  )
}
