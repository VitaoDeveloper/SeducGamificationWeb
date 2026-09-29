import { Card, CardTitle, PageHeader } from '../../components'

/**
 * Tela inicial do professor, provisória.
 *
 * A Etapa 03 troca esta por listar e criar salas. Ela existe porque o login do
 * professor já cai em `/salas` e, sem nenhuma rota nesse caminho, o router
 * mostraria uma página em branco no lugar do destino.
 */
export function SalasPage() {
  return (
    <>
      <PageHeader title="Salas" description="Turmas em que você leciona neste ano letivo." />

      <Card tone="primary" bar="left" className="mt-6 max-w-2xl">
        <CardTitle>Em construção</CardTitle>
        <p className="text-neutral-500 mt-1.5 text-sm">
          A lista de salas, a criação de sala e o cadastro de alunos chegam na Etapa 03.
        </p>
      </Card>
    </>
  )
}
