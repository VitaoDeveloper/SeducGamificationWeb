export { AlertaDeDesempate } from './AlertaDeDesempate'
export type { AlertaDeDesempateProps } from './AlertaDeDesempate'
export { AvisoDeConclusao } from './AvisoDeConclusao'
export type { AvisoDeConclusaoProps } from './AvisoDeConclusao'
export { CompeticaoDetailPage } from './CompeticaoDetailPage'
export { CompeticoesDaSala } from './CompeticoesDaSala'
export { ComponentesDePontuacao } from './ComponentesDePontuacao'
export type { ComponentesDePontuacaoProps } from './ComponentesDePontuacao'
export { DesempateForm } from './DesempateForm'
export type { DesempateFormProps } from './DesempateForm'
export { EncerrarBimestre } from './EncerrarBimestre'
export type { EncerrarBimestreProps } from './EncerrarBimestre'
export { GerenciarMembros } from './GerenciarMembros'
export type { GerenciarMembrosProps } from './GerenciarMembros'
export { LancamentosDeComponente } from './LancamentosDeComponente'
export type { LancamentosDeComponenteProps } from './LancamentosDeComponente'
export { NovaCompeticaoForm } from './NovaCompeticaoForm'
export type { NovaCompeticaoFormProps } from './NovaCompeticaoForm'
export { NovoComponenteForm } from './NovoComponenteForm'
export type { NovoComponenteFormProps } from './NovoComponenteForm'
export { NovoGrupoForm } from './NovoGrupoForm'
export type { NovoGrupoFormProps } from './NovoGrupoForm'
export { PreviaDaSintese } from './PreviaDaSintese'
export type { PreviaDaSinteseProps } from './PreviaDaSintese'
export { ROTA_COMPETICAO_DETALHE, rotaDaCompeticao } from './rotas'
export { SelecaoDeBimestre } from './SelecaoDeBimestre'
export type { SelecaoDeBimestreProps } from './SelecaoDeBimestre'
export { SintesesOficiais } from './SintesesOficiais'
export type { SintesesOficiaisProps } from './SintesesOficiais'
export { AVISO_DE_PREVIA, TabelaDeLancamentos } from './TabelaDeLancamentos'
export type { TabelaDeLancamentosProps } from './TabelaDeLancamentos'
export {
  useCompeticao,
  useCompeticoesDoLecionamento,
  useCompeticoesDaSala,
  useContextoDaCompeticao,
  useGrupos,
} from './competicoes.hooks'
export type { ContextoDaCompeticao } from './competicoes.hooks'
export {
  useComponentesDoBimestre,
  useLancamentos,
  useLancamentosDeComponentes,
  useValidacaoDePesos,
} from './componentes-pontuacao.hooks'
export {
  dataParaISO,
  formatarData,
  rotuloDoBimestre,
  validarBimestres,
} from './bimestres'
export type { BimestreForm, ErroDeBimestre, ValidacaoDeBimestres } from './bimestres'
export {
  CEM_PORCENTO,
  avaliarPesos,
  formatarPercentual,
  rotuloDoPeso,
  validarPesoPercentual,
} from './pesos'
export type { AvaliacaoDePesos, ComponenteComPeso, ValidacaoDePeso } from './pesos'
export { validarNotas } from './notas'
export type { ErroDeNota, NotaDigitada, ValidacaoDasNotas } from './notas'
export { calcularPreviaDoBimestre, sinteseDaMateriaPorAluno } from './previa-sintese'
export type {
  EntradaDaPrevia,
  EntradaDaPreviaDaMateria,
  NotaPendente,
  PreviaDoAluno,
  PreviaDoBimestre,
  PreviaDoGrupo,
  SinteseNaMateria,
} from './previa-sintese'
export {
  ESCALA_NUMERICA,
  MODELO_CPS_ETEC,
  MODELO_NUMERICO,
  TIPO_ESCALA,
  ehEscalaNumerica,
  modeloAvaliacaoDaEscola,
  validarValorNoModelo,
} from './modelo-avaliacao'
export type { ModeloAvaliacao, TipoEscala, ValidacaoDeValor } from './modelo-avaliacao'
export { SITUACAO_BIMESTRE } from './competicoes.tipos'
export type {
  AlunoDoMembro,
  Bimestre,
  CompeticaoCompleta,
  GrupoComMembros,
  GrupoCompetidor,
  GruposDaCompeticao,
  MembroDoGrupo,
  NovaCompeticao,
  NovoBimestre,
  SituacaoBimestre,
} from './competicoes.tipos'
export type {
  AlunoDoLancamento,
  ComponentePontuacao,
  ComponentePontuacaoDoBimestre,
  ComponentesDoBimestre,
  Lancamento,
  LancamentoCriado,
  LancarNota,
  LoteDeLancamentos,
  MateriaComPesos,
  MateriaPendente,
  NovoComponentePontuacao,
  ValidacaoDePesosDaApi,
} from './componentes-pontuacao.tipos'
export { encerrarBimestre, recusaDoEncerramento } from './encerramento.api'
export type {
  EmpateDoBimestre,
  GrupoEmpatado,
  PontuacoesFinais,
  PontuacaoFinalDoAluno,
  PontuacaoFinalDoGrupo,
  RecusaDoEncerramento,
  ResultadoDoEncerramento,
  SinteseOficialDoAluno,
  SinteseOficialDoGrupo,
  TotaisDoEncerramento,
} from './encerramento.tipos'
export {
  aplicarCriterioAutomatico,
  listarPendenciasDeDesempate,
  resolverDesempate,
  traduzirErroDoDesempate,
} from './desempate.api'
export { usePendenciasDeDesempate } from './desempate.hooks'
export {
  ordemDoDesempate,
  posicaoDoBlocoEmpatado,
  posicaoRepetida,
  posicoesIniciaisDoDesempate,
  rotuloDoEscopoDoDesempate,
} from './desempate'
export { ORIGEM_DESEMPATE, TIPO_EMPATE } from './desempate.tipos'
export type {
  CorpoDoDesempate,
  DesempateGravado,
  EmpateResidual,
  OrdemDeDesempate,
  PendenciaDeDesempate,
  RespostaDoDesempate,
  RespostaDoDesempateAutomatico,
} from './desempate.tipos'
