import { vi } from 'vitest'

/**
 * O que o navegador recebeu de um `dispararDownload`.
 *
 * `blob` fica como `Blob | undefined` porque o espião lê o blob pela URL de objeto
 * criada no clique anterior — se o link for clicado com uma URL que o espião não
 * viu passar por `createObjectURL`, não há blob a associatear, e o teste precisa
 * poder ver isso em vez de receber um `undefined` silencioso no lugar do arquivo.
 */
export interface BaixoEspiado {
  nomeDoArquivo: string
  blob: Blob | undefined
}

export interface EspiaDeDownload {
  /** Um registro por download disparado, na ordem em que foram disparados. */
  baixados: BaixoEspiado[]
  /** O `URL.createObjectURL` substituído, para asserções de chamada. */
  criarUrl: ReturnType<typeof vi.fn>
  /** O `URL.revokeObjectURL` substituído. */
  revogarUrl: ReturnType<typeof vi.fn>
  /** O `click` do `<a>` substituído, que pode ser reimplementado pelo teste. */
  clicar: ReturnType<typeof vi.fn>
  /** Devolve `URL` e `HTMLAnchorElement` ao estado do jsdom. */
  restaurar: () => void
}

/**
 * Troca `URL.createObjectURL`, `URL.revokeObjectURL` e o clique do `<a>` por
 * espiões, para que um teste veja o download que a tela disparou.
 *
 * **Por que é preciso.** O jsdom não implementa `URL.createObjectURL` (o
 * `dispararDownload` quebraria com "não é uma função"), e o clique de um `<a>`
 * com `href` faz o jsdom imprimir "Not implemented: navigation" — ruído que
 * esconderia um erro de verdade. Com o clique substituído, o teste lê o link que a
 * tela criou (`download` e `href`), que é a única forma de provar que o arquivo
 * saiu com o nome certo.
 *
 * O vínculo entre o link e o blob é feito pela URL de objeto: o espião guarda o
 * blob no `createObjectURL` e o procura no `href` do link no momento do clique,
 * que é como o navegador faz. Por isso `baixados[i].blob` é o blob daquele
 * download, e não "o último blob criado".
 *
 * Chame `restaurar()` num `afterEach` — os espiões são globais, e um teste que
 * deixasse o `click` trocado derrubaria todos os following.
 */
export function espiarNoDownload(): EspiaDeDownload {
  const baixados: BaixoEspiado[] = []
  const blobPorUrl = new Map<string, Blob>()

  const criarUrl = vi.fn((blob: Blob) => {
    const url = `blob:espiao/${blobPorUrl.size}`
    blobPorUrl.set(url, blob)
    return url
  })

  const revogarUrl = vi.fn()

  const clicar = vi.fn(function (this: HTMLAnchorElement) {
    const url = this.getAttribute('href') ?? ''
    baixados.push({ nomeDoArquivo: this.download, blob: blobPorUrl.get(url) })
  })

  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: criarUrl })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revogarUrl })
  HTMLAnchorElement.prototype.click = clicar as unknown as typeof HTMLAnchorElement.prototype.click

  return {
    baixados,
    criarUrl,
    revogarUrl,
    clicar,
    restaurar: () => {
      delete (URL as unknown as Record<string, unknown>).createObjectURL
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL
      delete (HTMLAnchorElement.prototype as unknown as Record<string, unknown>).click
    },
  }
}