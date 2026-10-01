/**
 * Rotas da área do aluno.
 *
 * O aluno tem uma rota só, e ela é a primeira tela de verdade dele: até a Etapa
 * 07 ele caía em `/em-breve`, que era um aviso de "ainda não existe". Agora cai
 * aqui, e o que esta tela mostra depende de uma competição — que a API ainda não
 * devolve para o aluno.
 *
 * **Limite da API que molda a tela.** Não há endpoint que liste as competições
 * de um aluno; os únicos abertos a ele são os relatórios (Etapa 10). Os rankings
 * que esta tela desenha saem de endpoints de professor, e por isso o aluno só os
 * vê se a API os liberar e se souber qual competição abrir. O caminho escolhido
 * foi a competição vir na URL, no formato que a aplicação usa nos outros links,
 * e a tela tratar a recusa (`403`) com uma mensagem em vez de quebrar. Quando a
 * API ganhar um endpoint de "minhas competições", é aqui que ele vira navegação
 * de verdade.
 */

export const ROTA_ALUNO = '/aluno'

/**
 * Link do dashboard do aluno para uma competição (e, opcionalmente, um bimestre).
 *
 * O `bimestreId` é opcional porque só o ranking parcial precisa dele: sem o
 * parâmetro a tela mostra o anual e o individual, que dependem apenas da
 * competição. Quem compartilha o link decide se quer o recorte do bimestre
 * junto.
 */
export function rotaDoAluno(competicaoId?: string, bimestreId?: string): string {
  if (!competicaoId) return ROTA_ALUNO

  const parametros = new URLSearchParams({ competicaoId })
  if (bimestreId) parametros.set('bimestreId', bimestreId)

  return `${ROTA_ALUNO}?${parametros.toString()}`
}
