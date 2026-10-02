import { screen } from '@testing-library/react'
import { renderComSessao } from '../../test/render'
import { TOKEN_DE_TESTE } from '../../test/handlers'
import { gravarSessao, TIPO_USUARIO } from '../../lib/sessao'
import { RelatoriosDoAluno } from './RelatoriosDoAluno'

const COMPETICAO_ID = 'comp-1'
const ALUNO_DA_SESSAO = 'a1'
const OUTRO_ALUNO = 'a9'

function sessaoDoAluno(id = ALUNO_DA_SESSAO) {
  gravarSessao({
    token: TOKEN_DE_TESTE,
    usuario: { id, tipo: TIPO_USUARIO.ALUNO, codigoMatricula: '26010' },
  })
}

function renderizar() {
  return renderComSessao(<RelatoriosDoAluno competicaoId={COMPETICAO_ID} />)
}

/**
 * Os links do aluno.
 *
 * O teste central é o do `href`: ele afirma que o relatório linkado é o do aluno da
 * sessão, e não um id que veio de algum lugar da URL. Um dashboard que aceitasse
 * `?alunoId=` seria um gerador de link para o relatório de qualquer pessoa — a API
 * recusaria com 403, mas a tela já teria oferecido o caminho, e é o caminho que o
 * teste precisa fechar.
 */
describe('RelatoriosDoAluno', () => {
  it('aponta os dois relatórios para o próprio aluno da sessão', () => {
    sessaoDoAluno()

    renderizar()

    expect(screen.getByRole('link', { name: 'Meu relatório individual' })).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_DA_SESSAO}/relatorio-individual?competicaoId=${COMPETICAO_ID}`,
    )
    expect(
      screen.getByRole('link', { name: 'Meu relatório comparado ao grupo' }),
    ).toHaveAttribute(
      'href',
      `/alunos/${ALUNO_DA_SESSAO}/relatorio-comparativo-grupo?competicaoId=${COMPETICAO_ID}`,
    )
  })

  it('segue o aluno que está na sessão, e não um id da tela', () => {
    // Duas sessões diferentes, o mesmo componente: o que muda no link é o dono da
    // sessão, nunca um parâmetro da URL da dashboard.
    sessaoDoAluno(OUTRO_ALUNO)
    const { unmount } = renderizar()

    expect(screen.getByRole('link', { name: 'Meu relatório individual' })).toHaveAttribute(
      'href',
      `/alunos/${OUTRO_ALUNO}/relatorio-individual?competicaoId=${COMPETICAO_ID}`,
    )
    expect(screen.getByRole('link', { name: 'Meu relatório individual' })).not.toHaveAttribute(
      'href',
      expect.stringContaining(ALUNO_DA_SESSAO),
    )

    unmount()
  })

  it('não oferece os relatórios de grupo, que são endereçados por grupoId', () => {
    sessaoDoAluno()

    renderizar()

    /*
     * Não há endpoint que diga ao aluno a que grupo ele pertence (`README-API.md`,
     * seção 11.13): linkar para `/grupos/:id/relatorio` exigiria um id que a tela não
     * tem e que não pode adivinhar. Quando a API abrir "minhas competições", é aqui
     * que o terceiro link nasce.
     */
    expect(screen.getAllByRole('link')).toHaveLength(2)
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('href', expect.stringContaining('/grupos/'))
    }
  })

  it('não busca nada: o bloco só aponta para onde a requisição é feita', () => {
    // Com `onUnhandledRequest: 'error'` no msw, uma requisição disparada aqui
    // quebraria o teste — e não é para haver nenhuma.
    sessaoDoAluno()

    renderizar()

    expect(screen.getByRole('heading', { name: 'Meus relatórios' })).toBeInTheDocument()
  })

  it('orienta a abrir pelo link da competição quando a tela não sabe dela', () => {
    sessaoDoAluno()

    renderComSessao(<RelatoriosDoAluno competicaoId={undefined} />)

    expect(
      screen.getByText(/Os relatórios aparecem quando esta tela é aberta pelo link da competição/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('não aparece para o professor', () => {
    gravarSessao({
      token: TOKEN_DE_TESTE,
      usuario: { id: 'prof-1', tipo: TIPO_USUARIO.PROFESSOR, codigoMatricula: '26001' },
    })

    renderizar()

    // Os relatórios de professor estão na aba "Relatórios" da competição, onde a
    // lista completa de grupos e alunos existe.
    expect(screen.queryByRole('heading', { name: 'Meus relatórios' })).not.toBeInTheDocument()
  })
})