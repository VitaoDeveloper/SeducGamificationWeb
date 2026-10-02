export {
  gruposPorBimestre,
  parcelasDaSoma,
  seriesDoComparativoDeGrupos,
  seriesDoComparativoDoAluno,
  serieDoRelatorio,
} from './series'
export type { GrupoDoBimestre, SerieComparativa } from './series'
export { GraficoDeSintese } from './GraficoDeSintese'
export type { GraficoDeSinteseProps, SerieDoGrafico } from './GraficoDeSintese'
export { RelatorioComparativoAlunoPage } from './RelatorioComparativoAlunoPage'
export { RelatorioComparativoGrupoPage } from './RelatorioComparativoGrupoPage'
export { RelatorioGrupoPage } from './RelatorioGrupoPage'
export { RelatorioIndividualPage } from './RelatorioIndividualPage'
export { RelatoriosDaCompeticao } from './RelatoriosDaCompeticao'
export type { RelatoriosDaCompeticaoProps } from './RelatoriosDaCompeticao'
export { RelatoriosDoAluno } from './RelatoriosDoAluno'
export type { RelatoriosDoAlunoProps } from './RelatoriosDoAluno'
export {
  AvisoSemSintese,
  BlocoDaPontuacaoFinal,
  ErroDoRelatorio,
  ESCALA_DO_EIXO,
  SecaoDeRelatorio,
  TabelaDeIntegrantes,
  TabelaDeMaterias,
} from './relatorios.componentes'
export type { BlocoDaPontuacaoFinalProps } from './relatorios.componentes'
export {
  buscarRelatorioComparativoDoAluno,
  buscarRelatorioComparativoDoGrupo,
  buscarRelatorioDoGrupo,
  buscarRelatorioIndividual,
  MENSAGEM_DE_ACESSO_AO_RELATORIO,
  traduzirErroDoRelatorio,
} from './relatorios.api'
export {
  useRelatorioComparativoDoAluno,
  useRelatorioComparativoDoGrupo,
  useRelatorioDoGrupo,
  useRelatorioIndividual,
} from './relatorios.hooks'
export {
  descreverEscala,
  ESCALA_DE_PONTUACAO,
  formatarPontuacao,
  MAXIMO_DA_PONTUACAO_FINAL_DO_GRUPO,
  MAXIMO_DA_SINTESE_BIMESTRAL,
  rotuloCurtoDoBimestre,
} from './relatorios.tipos'
export type {
  BimestreDoAluno,
  BimestreDoAlunoComparado,
  BimestreDoGrupo,
  BimestreDoRelatorio,
  ColegaDeGrupo,
  DescricaoDaEscala,
  EscalaDePontuacao,
  GrupoComparativo,
  IntegranteDoGrupo,
  MateriaDoAluno,
  Relatorio,
  RelatorioComparativoDoAluno,
  RelatorioComparativoDoGrupo,
  RelatorioDoGrupo,
  RelatorioIndividual,
  TipoDeRelatorio,
} from './relatorios.tipos'
export {
  ROTA_RELATORIO_COMPARATIVO_DO_ALUNO,
  ROTA_RELATORIO_COMPARATIVO_DO_GRUPO,
  ROTA_RELATORIO_DO_GRUPO,
  ROTA_RELATORIO_INDIVIDUAL,
  rotaDoRelatorioComparativoDoAluno,
  rotaDoRelatorioComparativoDoGrupo,
  rotaDoRelatorioDoGrupo,
  rotaDoRelatorioIndividual,
} from './rotas'