import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { formatarPontuacao, MAXIMO_DA_SINTESE_BIMESTRAL } from './relatorios.tipos'

/**
 * Uma série do gráfico: quem é e o que ele vale em cada bimestre.
 *
 * `valor: null` é o caso real e não um atalho — bimestre não encerrado, ou o
 * integrante que não estava naquele grupo naquele bimestre. O recharts desenha
 * `null` como um intervalo em branco (e não como zero), que é o que permite a
 * mesma série atravessar uma troca de grupo sem mentir que a nota era 0.
 */
export interface SerieDoGrafico {
  /** Identificador estável da série — o `id` do aluno ou do grupo. */
  id: string
  nome: string
  pontos: Array<{ rotulo: string; valor: number | null }>
}

export interface GraficoDeSinteseProps {
  /** Séries a desenhar, na ordem em que devem aparecer na legenda. */
  series: SerieDoGrafico[]
  /** Rótulo do gráfico, lido antes de qualquer número. */
  titulo: string
  /** Frase que explica a escala e o que a linha é. */
  descricao: string
  /** Série a desenhar mais grossa — o próprio aluno, no comparativo. */
  destaque?: string
  altura?: number
}

/**
 * Cores das séries, na ordem em que são atribuídas.
 *
 * Todas são tokens de `src/styles/tokens.css` — o gráfico não inventa cor, e o
 * `var()` mantém a paleta em um lugar só. A sequência alterna as duas famílias de
 * marca com os neutros para que duas linhas vizinhas não fiquem com a mesma cor;
 * com mais séries que cores, a lista repete em vez de criar um tom novo (nenhum
 * outro lugar da interface usaria aquele tom, então ele não existiria para mais
 * ninguém).
 */
const CORES_DAS_SERIES = [
  'var(--color-primary-600)',
  'var(--color-accent-600)',
  'var(--color-neutral-700)',
  'var(--color-primary-400)',
  'var(--color-accent-400)',
  'var(--color-neutral-400)',
]

const LARGURA_MINIMA = 320
/** Largura usada antes da medição — e a que o teste recebe, sem `ResizeObserver`. */
const LARGURA_PADRAO = 640

/**
 * A caixa do gráfico e a largura disponível nela.
 *
 * `ResizeObserver` quando existe, e a largura padrão quando não existe. O segundo
 * caso não é um atalho de teste: é o que segura o gráfico antes da primeira
 * medição, e é também o que acontece em ambiente onde a observação de tamanho não
 * está disponível — o gráfico aparece com um tamanho razoável em vez de sumir atrás
 * de um container de largura zero.
 *
 * Devolve a `ref` junto da largura porque é a mesma medição: o observador precisa
 * do elemento e o gráfico precisa do número, e um hook que devolvesse só um dos
 * dois obrigaria o componente a manter o outro por conta própria.
 */
function useLarguraDisponivel(): [RefObject<HTMLDivElement | null>, number] {
  const [largura, setLargura] = useState(LARGURA_PADRAO)
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alvo = caixa.current
    if (!alvo || typeof ResizeObserver === 'undefined') return

    const observador = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect.width ?? 0
      if (medida <= 0) return
      setLargura(Math.max(LARGURA_MINIMA, Math.round(medida)))
    })

    observador.observe(alvo)
    return () => observador.disconnect()
  }, [])

  return [caixa, largura]
}

/**
 * A tabela dos valores, fora da vista e dentro do DOM.
 *
 * O gráfico é uma imagem com pixels: quem usa leitor de tela, quem tem o gráfico
 * desabilitado e o teste precisam dos mesmos números, e nenhum dos três os lê de
 * um `path` no SVG. Por isso a tabela existe e é `sr-only` — ela não compete com
 * o desenho, mas é a fonte de verdade para quem não enxerga.
 */
function TabelaDosValores({ series, titulo }: { series: SerieDoGrafico[]; titulo: string }) {
  const rotulos = series[0]?.pontos.map((ponto) => ponto.rotulo) ?? []

  return (
    <table className="sr-only">
      <caption>{titulo}</caption>
      <thead>
        <tr>
          <th scope="col">Bimestre</th>
          {series.map((serie) => (
            <th key={serie.id} scope="col">
              {serie.nome}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rotulos.map((rotulo, indice) => (
          <tr key={rotulo}>
            <th scope="row">{rotulo}</th>
            {series.map((serie) => (
              <td key={serie.id}>{formatarPontuacao(serie.pontos[indice]?.valor ?? null)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** O texto que o balão de um ponto mostra: o valor já com as duas casas. */
function valorDoTooltip(valor: unknown): string {
  return typeof valor === 'number' ? formatarPontuacao(valor) : '—'
}

/**
 * Gráfico de linha das sínteses, bimestre a bimestre.
 *
 * Três decisões que definem a tela:
 *
 * 1. **O eixo Y é fixo em 0 a 10.** Ele não acompanha o maior valor, porque a
 *    escala da síntese é o que dá sentido à linha: um gráfico que se ajusta aos
 *    dados diria "8.25 é o máximo" num bimestre e "5.10 é o máximo" no outro, e a
 *    comparação visual — que é a razão de o gráfico existir — deixaria de valer.
 * 2. **A animação é desligada.** O gráfico é comparação, não enfeite: uma curva
 *    que se desenha por um segundo atrapalha quem está lendo o número ao lado e
 *    faz o teste esperar por um estado que ninguém chega a ver.
 * 3. **A legenda é do recharts, e a tabela é nossa.** A legenda é o que dá nome à
 *    linha, e ela precisa ser visível; os números exatos ficam na tabela `sr-only`
 *    e, nas telas que os pedem, também nas tabelas de matérias e integrantes.
 */
export function GraficoDeSintese({
  series,
  titulo,
  descricao,
  destaque,
  altura = 260,
}: GraficoDeSinteseProps) {
  const [caixa, largura] = useLarguraDisponivel()

  /*
   * Uma linha por bimestre, e cada série acha o seu valor pelo rótulo do
   * bimestre — a chave de junção é o `numero`, nunca a posição no array. As
   * séries chegam em ordens diferentes (o comparativo monta por integrante), e
   * casar por posição faria a série de um aluno entrar no bimestre errado sem
   * nenhum aviso.
   */
  const rotulos = series[0]?.pontos.map((ponto) => ponto.rotulo) ?? []
  const dados = rotulos.map((rotulo) => {
    const linha: Record<string, string | number | null> = { rotulo }
    for (const serie of series) {
      linha[serie.id] = serie.pontos.find((ponto) => ponto.rotulo === rotulo)?.valor ?? null
    }
    return linha
  })

  return (
    <figure className="relative space-y-3 overflow-clip">
      <figcaption className="space-y-1">
        <span className="text-neutral-700 block text-sm font-medium">{titulo}</span>
        <span className="text-neutral-500 block text-xs">{descricao}</span>
      </figcaption>

      <div ref={caixa} className="w-full">
        <LineChart width={largura} height={altura} data={dados} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }} />
          <YAxis
            domain={[0, MAXIMO_DA_SINTESE_BIMESTRAL]}
            width={40}
            tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }}
          />
          <Tooltip formatter={(valor) => [valorDoTooltip(valor), 'Síntese']} />
          {series.map((serie, indice) => (
            <Line
              key={serie.id}
              type="monotone"
              dataKey={serie.id}
              name={serie.nome}
              stroke={CORES_DAS_SERIES[indice % CORES_DAS_SERIES.length]}
              strokeWidth={serie.id === destaque ? 3 : 2}
              dot={{ r: serie.id === destaque ? 4 : 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </div>

      {/*
       * Legenda à mão, e não a do recharts: a legenda da lib é um SVG, que o
       * leitor de tela lê como imagem. Uma lista de `<span>` com um marcador da
       * cor ao lado de cada nome dá o mesmo desenho e nomeia cada linha — que é o
       * que o leitor precisa para saber o que é o quê.
       */}
      {series.length > 1 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((serie, indice) => (
            <li key={serie.id} className="text-neutral-600 flex items-center gap-1.5 text-xs">
              <span
                aria-hidden
                className="inline-block w-4 rounded-full"
                style={{
                  backgroundColor: CORES_DAS_SERIES[indice % CORES_DAS_SERIES.length],
                  height: serie.id === destaque ? 3 : 2,
                }}
              />
              {serie.nome}
            </li>
          ))}
        </ul>
      ) : null}

      <TabelaDosValores series={series} titulo={`${titulo} — valores`} />
    </figure>
  )
}