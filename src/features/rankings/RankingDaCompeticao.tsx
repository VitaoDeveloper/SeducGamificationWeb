import { useState } from 'react'
import { Alert } from '../../components'
import { PainelDoRankingIndividual, RankingAnual, RankingParcial } from './rankings.componentes'
import { useRankingDeGrupos, useRankingIndividual } from './rankings.hooks'
import { SITUACAO_BIMESTRE } from '../competicoes/competicoes.tipos'
import { TIPO_RANKING } from './rankings.tipos'
import type { TipoRanking } from './rankings.tipos'
import type { Bimestre } from '../competicoes/competicoes.tipos'

/** As três visões do ranking, na ordem em que a Etapa 08 as lista. */
const VISCOES = [
  { id: TIPO_RANKING.PARCIAL, rotulo: 'Parcial' },
  { id: TIPO_RANKING.ANUAL, rotulo: 'Anual' },
  { id: TIPO_RANKING.INDIVIDUAL, rotulo: 'Individual' },
] as const

type Visao = (typeof VISCOES)[number]['id']

const BOTAO = 'rounded-full px-3.5 py-2 text-sm font-medium transition-colors'
const BOTAO_ATIVO = 'bg-primary-50 text-primary-700'
const BOTAO_INATIVO = 'text-neutral-600 hover:text-primary-700'

export interface RankingDaCompeticaoProps {
  competicaoId: string
  bimestres: Bimestre[]
  /**
   * Bimestre do ranking parcial na primeira carga.
   *
   * O parcial é o único ranking que precisa de um bimestre escolhido, e o
   * padrão é o encerrado mais recente: parcial só existe para bimestre
   * encerrado — antes disso a API não tem síntese gravada — e o mais recente é
   * o que o professor quer ver ao abrir a aba.
   */
  bimestreInicial?: string
  /**
   * Visão que abre a aba.
   *
   * É o que permite ao aviso de conclusão da Etapa 07 levar o professor direto ao
   * ranking anual, em vez de deixá-lo na aba com o parcial aberto e um botão de
   * visão para achar. O estado é inicializado com este valor, e não sincronizado
   * depois: a aba só é montada quando o professor clica nela, e o clique em
   * "Ver o ranking final" monta a aba nova — não muda a de uma aba já aberta.
   */
  visaoInicial?: TipoRanking
  /** Id do aluno da sessão, para marcar a linha dele no ranking individual. */
  alunoId?: string
  /** Rótulo da marca "você" no ranking individual. */
  rotuloDeVoce?: string
  /**
   * Contador de revalidação, incrementado pela página quando um desempate é
   * gravado.
   *
   * O ranking é o único lugar da tela onde a ordem definida pelo desempate
   * aparece: `GET .../ranking` troca a posição do grupo desempatado, e não
   * recalcula nada no front. Por isso o desempate resolvido precisa chegar até
   * aqui como uma busca nova — e como busca, não como remonte, para que a visão
   * que o professor escolheu (e o bimestre do parcial) continuem onde estavam
   * enquanto a tabela troca as posições.
   *
   * Só a visão em exibição busca: as outras continuam sem requisição, que é o
   * que as hooks abaixo já garantem.
   */
  revalidacao?: number
}

/**
 * A aba "Ranking" da competição: parcial, anual e individual.
 *
 * As três visões ficam atrás de um seletor de botões, e não de três seções
 * empilhadas, porque as respostas têm escalas e granularidades diferentes: o
 * parcial é de um bimestre e vai a 10, o anual soma quatro e vai a 40, e o
 * individual é de média. Mostrar os três ao mesmo tempo daria três colunas
 * "Pontuação" com significados diferentes na mesma tela, que é a forma mais
 * rápida de alguém ler 33,10 como se fosse uma nota.
 *
 * Só a parcial e a anual saem de `useRankingDeGrupos`, e a individual de
 * `useRankingIndividual`: são chamadas distintas e a tela só pede a que está
 * em exibição, o que evita três requisições para a aba que mostra uma.
 *
 * A visão inicial é o parcial, e não o anual, mesmo com a competição
 * concluída: o parcial é o que tem dado mais recente, e quem abre a aba no fim
 * do ano costuma estar conferindo o bimestre que acabou de fechar. O caminho
 * para o resultado do ano é o botão do aviso de conclusão, que abre a aba já na
 * visão anual.
 */
export function RankingDaCompeticao({
  competicaoId,
  bimestres,
  bimestreInicial,
  visaoInicial = TIPO_RANKING.PARCIAL,
  alunoId,
  rotuloDeVoce,
  revalidacao = 0,
}: RankingDaCompeticaoProps) {
  const [visao, setVisao] = useState<Visao>(visaoInicial)
  const [bimestreEscolhido, setBimestreEscolhido] = useState(bimestreInicial)

  /*
   * O bimestre padrão do parcial é derivado no render, e não guardado em estado:
   * os bimestres chegam depois da primeira render, e um estado inicializado com
   * `bimestreInicial` ficaria vazio para sempre se o professor não informasse
   * nada. Derivar aqui faz a aba abrir no encerrado mais recente assim que a
   * competição carregar, sem efeito e sem estado que possa divergir.
   */
  const encerrados = bimestres.filter(
    (bimestre) => bimestre.situacao === SITUACAO_BIMESTRE.ENCERRADO,
  )
  const maisRecente = [...encerrados].sort((a, b) => b.numero - a.numero)[0]
  const bimestreId = bimestreEscolhido ?? maisRecente?.id

  const parcial = useRankingDeGrupos(
    visao === TIPO_RANKING.PARCIAL && bimestreId ? competicaoId : undefined,
    bimestreId,
    revalidacao,
  )
  const anual = useRankingDeGrupos(
    visao === TIPO_RANKING.ANUAL ? competicaoId : undefined,
    undefined,
    revalidacao,
  )
  const individual = useRankingIndividual(
    visao === TIPO_RANKING.INDIVIDUAL ? competicaoId : undefined,
    revalidacao,
  )

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Visões do ranking" className="flex flex-wrap gap-1">
        {VISCOES.map((item) => (
          <button
            key={item.id}
            id={`visao-${item.id}`}
            type="button"
            role="tab"
            aria-selected={item.id === visao}
            aria-controls={`painel-${item.id}`}
            onClick={() => setVisao(item.id)}
            className={`${BOTAO} ${item.id === visao ? BOTAO_ATIVO : BOTAO_INATIVO}`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {/*
       * Os três painéis coexistem no DOM e só um aparece: manter os outros
       * montados preservaria a posição do scroll e o resultado de uma busca já
       * feita, ao custo de renderizar três tabelas para ler uma. O que importa é
       * que cada painel só receba a requisição da sua visão — os hooks acima já
       * recebem `undefined` fora dela, e por isso não chamam a API.
       *
       * O aviso de que não há bimestre encerrado fica dentro do painel do
       * parcial, e não no lugar da aba inteira: sem ele ali, clicar em "Anual"
       * ou "Individual" não teria para onde ir justamente quando o professor
       * mais precisa dessas duas — antes de fechar o primeiro bimestre.
       */}
      <div role="tabpanel" id="painel-parcial" aria-labelledby="visao-parcial">
        {visao === TIPO_RANKING.PARCIAL ? (
          encerrados.length === 0 ? (
            <AvisoDeParcialIndisponivel />
          ) : (
            <RankingParcial
              dados={parcial.dados}
              carregando={parcial.carregando}
              erro={parcial.erro}
              aoRecarregar={parcial.recarregar}
              bimestres={encerrados}
              bimestreId={bimestreId}
              aoMudarBimestre={setBimestreEscolhido}
            />
          )
        ) : null}
      </div>

      <div role="tabpanel" id="painel-anual" aria-labelledby="visao-anual">
        {visao === TIPO_RANKING.ANUAL ? (
          <RankingAnual
            dados={anual.dados}
            carregando={anual.carregando}
            erro={anual.erro}
            aoRecarregar={anual.recarregar}
          />
        ) : null}
      </div>

      <div role="tabpanel" id="painel-individual" aria-labelledby="visao-individual">
        {visao === TIPO_RANKING.INDIVIDUAL ? (
          <PainelDoRankingIndividual
            dados={individual.dados}
            carregando={individual.carregando}
            erro={individual.erro}
            aoRecarregar={individual.recarregar}
            alunoId={alunoId}
            rotuloDeVoce={rotuloDeVoce}
          />
        ) : null}
      </div>
    </div>
  )
}

/**
 * O parcial ainda não existe porque nenhum bimestre foi encerrado.
 *
 * Aparece no lugar da tabela, e não como erro: nada falhou, a competição
 * simplesmente ainda não tem síntese gravada. A diferença importa para quem
 * lê — um erro sugere que a tela está quebrada, e este texto diz que a tela
 * está certa e o que falta é o professor encerrar o bimestre.
 */
function AvisoDeParcialIndisponivel() {
  return (
    <Alert tone="info">
      <p className="font-medium">Nenhum bimestre encerrado ainda.</p>
      <p className="mt-1">
        O ranking parcial aparece depois do encerramento de um bimestre, que é quando a API grava
        as sínteses. Enquanto isso, veja a prévia da síntese na aba ao lado.
      </p>
    </Alert>
  )
}
