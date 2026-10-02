import { useSearchParams } from 'react-router-dom'

import { Alert, Button, PageHeader } from '../../components'
import { useAuth } from '../auth'
import { SecaoDeRanking, useRankingDeGrupos, useRankingIndividual } from '../rankings'
import { RelatoriosDoAluno } from '../relatorios'

/**
 * A primeira tela de verdade do aluno: os rankings da competição dele.
 *
 * Antes desta etapa o aluno entrava e caía em `/em-breve`, um aviso de que a
 * área não existia. Substituir o aviso pela tela foi a tarefa mais simples da
 * etapa; o difícil está na frase "a competição dele".
 *
 * **Limite da API que molda a tela.** Os rankings são endpoints de professor, e
 * a API não tem — ainda — um endpoint que diga ao aluno em que competição ele
 * está. A saída foi a competição vir na URL (`?competicaoId=`), no mesmo formato
 * dos outros links do sistema, e a tela tratar a recusa em vez de supor que tem
 * acesso. Quando a API abrir os rankings para o aluno, esta página acende sem
 * mudança; quando abrir "minhas competições", é o `useSearchParams` abaixo que
 * vira navegação.
 *
 * A seção "Minha posição" vem primeiro porque é a pergunta que o aluno abre a
 * tela para responder: onde eu estou. As duas de equipes vêm depois, como
 * contexto — e a do bimestre só aparece se o link trouxe um `bimestreId` junto,
 * já que sem lista de bimestres acessível ao aluno não há como ele escolher um.
 */
export function AlunoDashboardPage() {
  const [parametros] = useSearchParams()
  const { usuario } = useAuth()

  const competicaoId = parametros.get('competicaoId') ?? undefined
  const bimestreId = parametros.get('bimestreId') ?? undefined

  /*
   * Os três hooks ficam no topo, mesmo quando não há competição, porque hook não
   * pode ser condicional. Sem id eles não chamam a API — `useRankingDeGrupos`
   * resolve `null` quando o primeiro argumento é `undefined` —, então a página
   * sem competição não dispara requisição nenhuma.
   *
   * O parcial só busca quando veio um bimestre na URL (o `competicaoId` é passado
   * como `undefined` fora disso): sem o recorte, ele seria a mesma chamada do
   * anual, repetida à toa. Anual e parcial são respostas diferentes da mesma rota,
   * e é o `bimestreId` que diz qual delas.
   */
  const individual = useRankingIndividual(competicaoId)
  const anual = useRankingDeGrupos(competicaoId, undefined)
  const parcial = useRankingDeGrupos(bimestreId ? competicaoId : undefined, bimestreId)

  const recarregarTudo = () => {
    individual.recarregar()
    anual.recarregar()
    parcial.recarregar()
  }

  if (!competicaoId) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Meus resultados" description="Seus rankings na competição da sua sala." />
        <Alert tone="info" className="mt-6">
          <p className="font-medium">Nenhuma competição informada.</p>
          <p className="mt-1">
            Abra esta tela pelo link da competição da sua sala para ver a sua posição e a das
            equipes.
          </p>
        </Alert>
      </div>
    )
  }

  /*
   * O erro é mostrado uma vez, no topo, e não dentro de cada seção: as três
   * consultas compartilham a mesma recusa (o `403` de acesso fora do escopo), e
   * três alertas iguais na mesma tela leem como três problemas. Qualquer erro
   * que chegue serve para o aviso; as seções abaixo recebem `erro={null}` e
   * seguem mostrando o que veio.
   */
  const erro = individual.erro ?? anual.erro ?? parcial.erro

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Meus resultados" description="Seus rankings na competição da sua sala." />

      {erro ? (
        <Alert tone="erro">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{erro}</span>
            <Button variant="outline" size="sm" onClick={recarregarTudo}>
              Tentar de novo
            </Button>
          </div>
        </Alert>
      ) : null}

      <SecaoDeRanking
        id="aluno-minha-posicao"
        titulo="Minha posição"
        itens={individual.dados?.itens ?? []}
        rowKey={(linha) => linha.alunoId}
        nomeDaColuna="Aluno"
        mensagemVazia="Nenhum resultado individual ainda."
        carregando={individual.carregando}
        erro={null}
        aoRecarregar={recarregarTudo}
        bimestresEncerrados={individual.dados?.bimestresEncerrados}
        destacar={(linha) => linha.alunoId === usuario?.id}
        rotuloDaDestaque="Você"
      />

      <SecaoDeRanking
        id="aluno-ranking-equipes-ano"
        titulo="Ranking das equipes — ano"
        itens={anual.dados?.itens ?? []}
        rowKey={(linha) => linha.grupoId}
        nomeDaColuna="Equipe"
        mensagemVazia="Nenhum resultado por equipe ainda."
        carregando={anual.carregando}
        erro={null}
        aoRecarregar={recarregarTudo}
        bimestresEncerrados={anual.dados?.bimestresEncerrados}
      />

      {bimestreId ? (
        <SecaoDeRanking
          id="aluno-ranking-equipes-bimestre"
          titulo="Ranking das equipes — bimestre"
          itens={parcial.dados?.itens ?? []}
          rowKey={(linha) => linha.grupoId}
          nomeDaColuna="Equipe"
          mensagemVazia="Nenhum resultado neste bimestre."
          carregando={parcial.carregando}
          erro={null}
          aoRecarregar={recarregarTudo}
        />
      ) : null}

      {/*
       * Os relatórios ficam depois dos rankings, e não antes: o aluno vem aqui
       * pela posição dele, e o relatório é a explicação — a pergunta seguinte.
       * O bloco só aparece para o aluno, porque é o dono dos relatórios que ele
       * pode abrir; o `alunoId` vem da sessão dentro do próprio bloco, e não da
       * URL (ver `RelatoriosDoAluno`).
       */}
      <RelatoriosDoAluno competicaoId={competicaoId} />
    </div>
  )
}
