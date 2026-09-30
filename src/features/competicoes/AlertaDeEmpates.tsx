import { Alert, Button } from '../../components'
import { formatarSintese } from '../../lib/sinteseCalculo'
import { rotuloDoBimestre } from './bimestres'
import type { EmpateDoBimestre } from './encerramento.tipos'

export interface AlertaDeEmpatesProps {
  /** Empates do encerramento; lista vazia não renderiza nada. */
  empates: EmpateDoBimestre[]
  /** Bimestre em que os empates foram detectados, para o texto não ficar solto. */
  numeroDoBimestre: number
}

/**
 * Banner de empate detectado no encerramento.
 *
 * A API devolve os empates junto com o encerramento porque é a única hora em que
 * eles nascem: enquanto o bimestre está aberto, o ranking parcial não existe. E
 * detectá-los é só metade do trabalho — a outra metade é o professor resolver, e
 * um empate que aparece no fim de uma tela, depois das tabelas, é um empate que
 * passa sem ser lido.
 *
 * Três decisões:
 *
 * 1. **Fica no topo da página da competição**, e não dentro do painel de
 *    encerramento: o encerramento é pontual, o empate é pendência — continua
 *    valendo enquanto o professor estiver na tela.
 * 2. **Tom de erro.** Não há tom "aviso" no design system, e um empate por
 *    resolver é a única condição pós-encerramento que a API não consegue resolver
 *    sozinha: o `role="alert"` é o que faz o leitor de tela anunciar em vez de
 *    só registrar.
 * 3. **A ação vem desabilitada, e não sumida.** A tela de desempate é a Etapa 09;
 *    até lá, o botão segue no lugar com o aviso de quando chega — o mesmo
 *    tratamento que a aba de Rankings já tem na página da competição. Um professor
 *    que procure "onde resolvo o empate" precisa encontrar a resposta, mesmo que
 *    ela ainda seja "em breve".
 */
export function AlertaDeEmpates({ empates, numeroDoBimestre }: AlertaDeEmpatesProps) {
  if (empates.length === 0) return null

  const rotulo = rotuloDoBimestre(numeroDoBimestre)
  const gruposEmpatados = empates.flatMap((empate) => empate.grupos)

  return (
    <Alert tone="erro">
      <p className="font-medium">
        {gruposEmpatados.length} {gruposEmpatados.length === 1 ? 'equipe empatou' : 'equipes empataram'}{' '}
        no {rotulo}.
      </p>

      <ul className="mt-1.5 space-y-1">
        {empates.map((empate) => (
          <li key={empate.grupos.map((grupo) => grupo.grupoId).join('-')}>
            <span className="font-medium tabular-nums">{formatarSintese(empate.valor)}</span>{' '}
            — {empate.grupos.map((grupo) => grupo.nome).join(' e ')}
          </li>
        ))}
      </ul>

      <p className="mt-1.5">
        Empate não é erro: a API só registra que duas equipes fecharam com a mesma pontuação.
        Definir a ordem é decisão do professor — manual ou pelo critério automático de maior peso.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="outline" disabled title="Chega na Etapa 09">
          Resolver desempate
        </Button>
        <span className="text-neutral-500 text-xs">A tela de desempate chega na Etapa 09.</span>
      </div>
    </Alert>
  )
}
