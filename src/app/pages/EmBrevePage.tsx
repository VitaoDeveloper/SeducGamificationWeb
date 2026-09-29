import { Button, Card, CardTitle, PageHeader } from '../../components'
import { useAuth } from '../../features/auth'

/**
 * Área do aluno, ainda não existe.
 *
 * O aluno entra pela mesma tela do professor, com o mesmo código de matrícula, e
 * cai aqui até a Etapa 08, quando entram os rankings. Não há outra rota de aluno
 * nesta rodada: o token diz que a pessoa é `ALUNO` e o router a traz para cá.
 */
export function EmBrevePage() {
  const { usuario, logout } = useAuth()

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Bem-vindo(a), ${usuario?.codigoMatricula ?? ''}`}
        description="Você entrou como aluno."
      />

      <Card tone="accent" bar="left" className="mt-6">
        <CardTitle>Área do aluno em construção</CardTitle>
        <p className="text-neutral-500 mt-1.5 text-sm">
          Aqui vão aparecer seus resultados, a posição da sua equipe no ranking e os relatórios.
          Nada disso está pronto ainda — o primeiro acesso de um aluno é só o login.
        </p>
        <Button variant="secondary" onClick={logout} className="mt-5">
          Sair
        </Button>
      </Card>
    </div>
  )
}
