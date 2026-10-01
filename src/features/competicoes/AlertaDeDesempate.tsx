import { Alert, Button } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { rotuloDoEscopoDoDesempate } from './desempate'
import type { PendenciaDeDesempate } from './desempate.tipos'
import type { Bimestre } from './competicoes.tipos'

export interface AlertaDeDesempateProps {
  /** Empates que a API ainda devolve como pendentes, em qualquer escopo. */
  pendencias: PendenciaDeDesempate[]
  /** Bimestres da competição, para nomear o escopo parcial. */
  bimestres: Bimestre[]
  /** Falha ao listar as pendências; o aviso some, e a falha fica no lugar dele. */
  erro?: string | null
  /** Refaz a listagem depois de uma falha. */
  aoRecarregar?: () => void
  /** Abre a tela de desempate da pendência escolhida. Sem isso, o botão some. */
  aoResolver?: (pendencia: PendenciaDeDesempate) => void
}

/**
 * Banner de empate pendente de desempate, no topo da página da competição.
 *
 * Nasce da Etapa 07 como um aviso dentro do encerramento — o `AlertaDeEmpates`, um
 * botão desabilitado escrito "chega na Etapa 09" — e a Etapa 09 o troca por este,
 * que lê `GET /competicoes/:id/desempate/pendencias`. A troca não é um detalhe de
 * implementação, é a diferença entre dois lugares possíveis de a informação:
 *
 * 1. **O aviso do encerramento morre com a sessão.** Ele se apoia na resposta do
 *    `POST .../encerrar` e no estado da página, de modo que o empate detectado
 *    numa terça às 20h some quando o professor fecha o navegador. O desempate
 *    pode ser resolvido em qualquer dia até o fim da competição, e quem não
 *    resolveu de primeira é justamente quem volta à tela dias depois.
 * 2. **A pendência é da competição inteira, não de um bimestre.** Um empate do
 *    1º bimestre continua aberto com o professor no 4º, e é por isso que a API
 *    devolve uma lista de todos os escopos. Uma tela que só mostrasse o empate do
 *    bimestre em exibição esconderia os outros.
 *
 * Por isso o estado da tela segue a lista da API e nada mais: `pendencias.length
 * === 0` não renderiza nada, e quem resolve o empate — por qualquer um dos dois
 * caminhos — some com o aviso porque a próxima listagem já não devolve o bloco.
 *
 * A falha da listagem também tem voz. Uma pendência que a API não conseguiu
 * listar é um empate que a tela está escondendo, e um silêncio ali seria o pior
 * dos desfechos: o professor concluiria que não há nada para resolver.
 */
export function AlertaDeDesempate({
  pendencias,
  bimestres,
  erro,
  aoRecarregar,
  aoResolver,
}: AlertaDeDesempateProps) {
  if (pendencias.length === 0 && !erro) return null

  return (
    <div className="space-y-4">
      {erro ? (
        <Alert tone="erro">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{erro}</span>
            {aoRecarregar ? (
              <Button variant="outline" size="sm" onClick={aoRecarregar}>
                Tentar de novo
              </Button>
            ) : null}
          </div>
        </Alert>
      ) : null}

      {pendencias.length === 0 ? null : <AvisoDeEmpates pendencias={pendencias} bimestres={bimestres} aoResolver={aoResolver} />}
    </div>
  )
}

/** O aviso em si, separado porque é a parte que depende dos dados. */
function AvisoDeEmpates({
  pendencias,
  bimestres,
  aoResolver,
}: Pick<AlertaDeDesempateProps, 'pendencias' | 'bimestres' | 'aoResolver'>) {
  const equipes = pendencias.reduce((total, item) => total + item.grupos.length, 0)

  return (
    <Alert tone="erro">
      <p className="font-medium">{resumo(pendencias, equipes, bimestres)}</p>

      <ul className="mt-1.5 space-y-1.5">
        {pendencias.map((pendencia) => (
          <li key={desempateDoItem(pendencia)} className="flex flex-wrap items-center gap-x-2.5">
            <span className="text-neutral-700 font-medium">
              {rotuloDoEscopoDoDesempate(pendencia, bimestres)}
            </span>
            <span className="min-w-0">
              <span className="font-medium tabular-nums">{formatarSintese(pendencia.valor)}</span>{' '}
              — {pendencia.grupos.map((grupo) => grupo.nome).join(' e ')}
            </span>

            {aoResolver ? (
              <Button size="sm" variant="outline" onClick={() => aoResolver(pendencia)}>
                Resolver desempate
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-2.5">
        Empate não é erro: a API só registra que duas equipes fecharam com a mesma pontuação.
        Definir a ordem é decisão do professor — na mão, ou pelo critério automático de maior
        peso.
      </p>
    </Alert>
  )
}

/**
 * A frase de abertura, que muda conforme quantos empates há.
 *
 * Com um só — o caso de quem acabou de encerrar um bimestre — a frase nomeia o
 * escopo ("2 equipes empataram no 1º Bimestre"), que é a informação que o
 * professor acabou de produzir e precisa confirmar. Com vários, dizer o escopo
 * obrigaria a escolher um entre os demais, e a lista logo abaixo já mostra todos:
 * a abertura passa a dar o tamanho do problema.
 */
function resumo(
  pendencias: PendenciaDeDesempate[],
  equipes: number,
  bimestres: Bimestre[],
): string {
  if (pendencias.length === 1) {
    const escopo = rotuloDoEscopoDoDesempate(pendencias[0]!, bimestres)
    return `${equipes} ${equipes === 1 ? 'equipe empatou' : 'equipes empataram'} no ${escopo}.`
  }

  const rodadas = pendencias.length
  return `${equipes} ${equipes === 1 ? 'equipe continua' : 'equipes continuam'} empatada${equipes === 1 ? '' : 's'} em ${rodadas} rodadas de ranking.`
}

/** Chave estável da pendência na lista: o escopo e as equipes que empataram. */
function desempateDoItem(pendencia: PendenciaDeDesempate): string {
  return `${pendencia.bimestreId ?? 'anual'}:${pendencia.grupos.map((grupo) => grupo.grupoId).join('-')}`
}