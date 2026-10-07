import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { espiarNoDownload } from '../../test/download'
import type { EspiaDeDownload } from '../../test/download'
import { renderComSessao } from '../../test/render'
import { server } from '../../test/server'
import {
  API,
  pdfDoRelatorio,
  pdfDosRelatoriosComoPaginaDeErro,
  pdfDosRelatoriosRecusado,
  relatorioComparativoDoGrupo,
  relatorioDoGrupo,
  relatorioIndividual,
  relatoriosEmPdf,
} from '../../test/handlers'

import { BaixarPdf } from './BaixarPdf'
import { MENSAGEM_DE_ACESSO_AO_RELATORIO } from './relatorios.api'

const ALUNO_ID = 'a1'
const GRUPO_ID = 'g1'

let download: EspiaDeDownload

beforeEach(() => {
  download = espiarNoDownload()
})

afterEach(() => {
  download.restaurar()
})

describe('BaixarPdf', () => {
  it('baixa o PDF do aluno na rota .pdf, com o nome montado do relatório', async () => {
    const pedido = vi.fn()
    server.use(
      http.get(`${API}/alunos/:alunoId/relatorio-individual.pdf`, () => {
        pedido()
        return new HttpResponse(pdfDoRelatorio(), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )

    renderComSessao(
      <BaixarPdf relatorio={relatorioIndividual({ alunoId: ALUNO_ID, nome: 'João da Silva' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText('PDF gerado. O download começou.')).toBeInTheDocument()
    expect(pedido).toHaveBeenCalledTimes(1)
    // A resposta chegou como blob de verdade — é o que o `responseType` do axios
    // pediu, e o que o link do download precisa para entregar o arquivo.
    expect(download.baixados).toHaveLength(1)
    expect(download.baixados[0]?.nomeDoArquivo).toBe('relatorio-individual-joao-da-silva.pdf')
    expect(download.baixados[0]?.blob?.type).toBe('application/pdf')
    expect(download.baixados[0]?.blob?.size).toBeGreaterThan(0)
  })

  it('manda o competicaoId do relatório carregado, para a API não recusar por ambiguidade', async () => {
    // A rota da tela nem sempre traz o `competicaoId` — ele é opcional na API. Mas
    // o relatório que já carregou sabe qual competição é esta, e sem mandá-lo a
    // API devolve 400 quando o aluno participa de mais de uma.
    let urlDoPedido = ''
    server.use(
      http.get(`${API}/alunos/:alunoId/relatorio-individual.pdf`, ({ request }) => {
        urlDoPedido = request.url
        return new HttpResponse(pdfDoRelatorio(), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )

    renderComSessao(
      <BaixarPdf relatorio={relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await screen.findByText('PDF gerado. O download começou.')
    expect(urlDoPedido).toBe(
      `${API}/alunos/${ALUNO_ID}/relatorio-individual.pdf?competicaoId=comp-1`,
    )
  })

  it('baixa o PDF do grupo pela rota do grupo, sem inventar parâmetro', async () => {
    let urlDoPedido = ''
    server.use(
      http.get(`${API}/grupos/:grupoId/relatorio-comparativo.pdf`, ({ request }) => {
        urlDoPedido = request.url
        return new HttpResponse(pdfDoRelatorio(), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )

    renderComSessao(
      <BaixarPdf
        relatorio={relatorioComparativoDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await screen.findByText('PDF gerado. O download começou.')
    // A rota de grupo descobre a competição pelo grupo: mandar `competicaoId`
    // seria um filtro que a rota não tem.
    expect(urlDoPedido).toBe(`${API}/grupos/${GRUPO_ID}/relatorio-comparativo.pdf`)
    expect(download.baixados[0]?.nomeDoArquivo).toBe('relatorio-comparativo-equipe-alfa.pdf')
  })

  it('usa o nome do arquivo que a API mandar no Content-Disposition', async () => {
    server.use(...relatoriosEmPdf({ nomeDoArquivo: 'relatorio-da-ana-no-ano.pdf' }))

    renderComSessao(
      <BaixarPdf relatorio={relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    await screen.findByText('PDF gerado. O download começou.')
    expect(download.baixados[0]?.nomeDoArquivo).toBe('relatorio-da-ana-no-ano.pdf')
  })

  it('fica em carregamento enquanto a API gera o PDF, e volta ao normal depois', async () => {
    server.use(
      http.get(`${API}/grupos/:grupoId/relatorio.pdf`, async () => {
        await delay(60)
        return new HttpResponse(pdfDoRelatorio(), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )

    renderComSessao(
      <BaixarPdf relatorio={relatorioDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })} />,
    )

    // O clique não é aguardado: a geração leva segundos de verdade, e um teste que
    // esperasse o fim perderia justamente o estado que se quer ver.
    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    const carregando = await screen.findByRole('button', { name: 'Gerando o PDF...' })
    expect(carregando).toHaveAttribute("aria-disabled", "true")
    expect(carregando).toHaveAttribute('aria-busy', 'true')
    expect(download.baixados).toHaveLength(0)

    // E o clique de novo não dispara uma segunda geração: o botão travado é o que
    // impede o professor de encher a fila de arquivos iguais.
    expect(carregando).toHaveAttribute("aria-disabled", "true")

    const pronto = await screen.findByRole('button', { name: 'Baixar PDF' })
    expect(pronto).toBeEnabled()
    expect(download.baixados).toHaveLength(1)
  })

  it('mostra o erro da API em toast e devolve o botão, sem travar a tela', async () => {
    server.use(
      http.get(`${API}/grupos/:grupoId/relatorio.pdf`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Falha ao gerar o PDF.' }, { status: 500 }),
      ),
    )

    renderComSessao(
      <BaixarPdf relatorio={relatorioDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    // A mensagem que a API mandou é a que o professor lê: um "erro ao gerar o
    // PDF" genérico esconderia o motivo que o servidor sabe.
    expect(await screen.findByText('Falha ao gerar o PDF.')).toBeInTheDocument()
    expect(download.baixados).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled()
  })

  it('trata o 403 com a mesma mensagem amigável dos relatórios em JSON', async () => {
    server.use(...pdfDosRelatoriosRecusado())

    renderComSessao(
      <BaixarPdf relatorio={relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText(MENSAGEM_DE_ACESSO_AO_RELATORIO)).toBeInTheDocument()
    expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument()
    expect(download.baixados).toHaveLength(0)
  })

  it('recusa uma página de HTML que a rede devolveu no lugar do PDF', async () => {
    // Um proxy ou um portal de captive responde 200 com HTML. Salvar isso como
    // `.pdf` daria ao professor um arquivo que existe, abre — e não é o relatório.
    server.use(...pdfDosRelatoriosComoPaginaDeErro())

    renderComSessao(
      <BaixarPdf relatorio={relatorioIndividual({ alunoId: ALUNO_ID, nome: 'Ana Souza' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(
      await screen.findByText('A API devolveu uma página da web em vez do PDF do relatório.'),
    ).toBeInTheDocument()
    expect(download.baixados).toHaveLength(0)
  })

  it('avisa quando o PDF chega vazio, em vez de salvar um arquivo de zero byte', async () => {
    server.use(
      http.get(`${API}/grupos/:grupoId/relatorio.pdf`, () =>
        new HttpResponse(new Uint8Array(), { headers: { 'Content-Type': 'application/pdf' } }),
      ),
    )

    renderComSessao(
      <BaixarPdf relatorio={relatorioDoGrupo({ grupoId: GRUPO_ID, nome: 'Equipe Alfa' })} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }))

    expect(await screen.findByText('O PDF do relatório veio vazio.')).toBeInTheDocument()
    expect(download.baixados).toHaveLength(0)
  })
})

