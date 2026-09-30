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
import { useCompeticao, useContextoDaCompeticao, useGrupos } from './competicoes.hooks'
import { SITUACAO_BIMESTRE } from './competicoes.tipos'
import type { Bimestre, GrupoComMembros } from './competicoes.tipos'
import { ComponentesDePontuacao } from './ComponentesDePontuacao'
import { GerenciarMembros } from './GerenciarMembros'
import { LancamentosDeComponente } from './LancamentosDeComponente'
import { modeloAvaliacaoDaEscola } from './modelo-avaliacao'
import { NovoGrupoForm } from './NovoGrupoForm'
import { SelecaoDeBimestre } from './SelecaoDeBimestre'
import { rotaDasCompeticoes } from '../salas/rotas'
import { useAlunos } from '../salas/salas.hooks'

const ABA = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const ABA_ATIVA = 'bg-primary-50 text-primary-700'

/** As seções da competição, na ordem em que o professor monta o bimestre. */
type AbaDaCompeticao = 'grupos' | 'componentes' | 'lancamentos'

/**
 * Abas da competição, com a de rankings ainda por vir.
 *
 * A navegação já nasceu na Etapa 04 porque a tela ia crescer: pontuação, lançamentos
 * e rankings penduram-se no mesmo "qual bimestre estou vendo". Deixar a aba futura
 * visível e desabilitada evita que a página pareça pronta e depois se reorganize
 * inteira quando a etapa chegar.
 */
const ABAS: Array<{ id: AbaDaCompeticao; rotulo: string }> = [
  { id: 'grupos', rotulo: 'Grupos' },
  { id: 'componentes', rotulo: 'Componentes' },
  { id: 'lancamentos', rotulo: 'Lançamentos' },
]

/** A aba que ainda não existe: fica visível e desabilitada, com o aviso de quando chega. */
const ABA_A_CHEGAR = { rotulo: 'Rankings', etapa: 'Chega na Etapa 06' }

/**
 * Detalhe da competição: os quatro bimestres, os grupos, a pontuação e os lançamentos.
 *
 * A página inteira gira em torno do bimestre selecionado, e por isso a escolha
 * dele é o primeiro controle depois do cabeçalho: no primeiro carregamento abre no
 * bimestre aberto mais recente — o que o professor está montando agora — e, sem
 * nenhum aberto, no primeiro, para não abrir vazia. O seletor fica acima das
 * abas porque todas as três penduram a mesma escolha.
 */
export function CompeticaoDetailPage() {
  const { competicaoId } = useParams<{ competicaoId: string }>()
  const toast = useToast()

  const competicao = useCompeticao(competicaoId)
  const [bimestreEscolhido, setBimestreEscolhido] = useState<string>()
  const [aba, setAba] = useState<AbaDaCompeticao>('grupos')
  const [componenteEscolhido, setComponenteEscolhido] = useState<string>()

  const bimestres = competicao.dados?.bimestres ?? []

  /*
   * O bimestre padrão é o aberto mais recente — o que o professor está montando
   * agora — e, sem nenhum aberto, o primeiro. É derivado no render, e não guardado
   * num efeito: assim que a competição chega, a conta já vale, sem um render a
   * mais e sem estado que possa divergir dos dados.
   */
  const aberto = [...bimestres]
    .sort((a, b) => b.numero - a.numero)
    .find((bimestre) => bimestre.situacao === SITUACAO_BIMESTRE.ABERTO)
  const bimestreId = bimestreEscolhido ?? (aberto ?? bimestres[0])?.id

  // Só busca os grupos quando já há um bimestre escolhido: a escolha padrão sai
  // dos próprios bimestres que a competição trouxe, e pedir os grupos antes disso
  // seria uma requisição a mais que a tela ainda não sabe usar.
  const grupos = useGrupos(bimestreId ? competicaoId : undefined, bimestreId)

  const contexto = useContextoDaCompeticao(competicao.dados?.lecionamentoId)
  const sala = contexto.dados?.sala
  const alunos = useAlunos(sala?.id)

  const bimestreAtual = bimestres.find((bimestre) => bimestre.id === bimestreId)
  const encerrado = bimestreAtual?.situacao === SITUACAO_BIMESTRE.ENCERRADO
  const listaDeGrupos = grupos.dados?.grupos ?? []

  /*
   * Trocar de bimestre descarta o componente escolhido: o mesmo componente em outro
   * bimestre é outro componente, e manter a seleção mostraria uma lista de notas
   * que não é a do bimestre que o professor acabou de abrir.
   */
  function trocarBimestre(novoBimestreId: string) {
    setBimestreEscolhido(novoBimestreId)
    setComponenteEscolhido(undefined)
  }

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
  const modelo = modeloAvaliacaoDaEscola(sala?.escola)

  return (
    <>
      <PageHeader
        title={dados.nome}
        description={sala ? `${sala.nome} · ${sala.escola.nome}` : 'Competição da sala'}
        action={
          sala ? (
            <Link to={rotaDasCompeticoes(sala.id)}>
              <Button variant="outline">Competições da sala</Button>
            </Link>
          ) : null
        }
      />

      <nav
        role="tablist"
        aria-label="Seções da competição"
        className="border-line mt-5 flex flex-wrap gap-1 border-b pb-3"
      >
        {ABAS.map((item) => (
          <button
            key={item.id}
            id={`aba-${item.id}`}
            type="button"
            role="tab"
            aria-selected={item.id === aba}
            onClick={() => setAba(item.id)}
            className={`${ABA} ${item.id === aba ? ABA_ATIVA : 'text-neutral-600 hover:text-primary-700'}`}
          >
            {item.rotulo}
          </button>
        ))}

        <span
          aria-disabled
          title={ABA_A_CHEGAR.etapa}
          className={`${ABA} cursor-not-allowed text-neutral-400`}
        >
          {ABA_A_CHEGAR.rotulo}
        </span>
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
          onChange={trocarBimestre}
        />

        <div role="tabpanel" aria-labelledby={`aba-${aba}`}>
          {aba === 'grupos' ? (
            <>
              {grupos.erro ? (
                <Alert tone="erro" className="mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>{grupos.erro}</span>
                    <Button variant="outline" size="sm" onClick={grupos.recarregar}>
                      Tentar de novo
                    </Button>
                  </div>
                </Alert>
              ) : null}

              <div className="space-y-6">
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
                      O grupo é a equipe que representa a turma na competição. Depois
                      de criado, você distribui os alunos em cada bimestre.
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
                          <span className="text-neutral-500 text-sm">
                            Carregando alunos…
                          </span>
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
          ) : null}

          {aba === 'componentes' && bimestreAtual ? (
            <ComponentesDePontuacao
              bimestre={bimestreAtual}
              componentesCurriculares={contexto.dados?.lecionamento.componentesCurriculares ?? []}
            />
          ) : null}

          {aba === 'lancamentos' && bimestreAtual ? (
            <LancamentosDeComponente
              bimestre={bimestreAtual}
              componenteId={componenteEscolhido}
              onComponenteChange={setComponenteEscolhido}
              alunos={alunos.dados ?? []}
              modelo={modelo}
            />
          ) : null}
        </div>
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
