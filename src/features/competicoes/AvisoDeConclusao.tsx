import { Alert, Button } from '../../components'

export interface AvisoDeConclusaoProps {
  /**
   * `true` quando a API marcou este encerramento como o fim da competição.
   *
   * O nome segue o campo do backend (`competicaoConcluida`) de propósito: a tela
   * não traduz o dado no meio do caminho, e quem for comparar com a documentação
   * da API não precisa lembrar de um sinônimo.
   */
  competicaoConcluida: boolean
}

/**
 * Aviso de que a competição acabou, depois do encerramento do último bimestre.
 *
 * A Etapa 07 pede que o 4º bimestre seja destacado na tela porque o encerramento
 * dele é um evento diferente dos outros: é o último, e é o único que fecha a
 * competição. Sem um aviso, o professor vê "Encerrado" no quarto bimestre como
 * viu nos outros três e não tem nada na tela indicando que agora o que importa é
 * o resultado do ano.
 *
 * A palavra "concluída" vem do backend (`competicaoConcluida` na resposta do
 * encerramento), e não de `numero === 4` no front: quem sabe se a competição
 * acabou é quem aplicou a regra.
 *
 * Os pontos finais que a API devolve em `pontuacoesFinais` não são mostrados aqui
 * de propósito: ordená-los com posição, empate e desempate é a aba de Rankings
 * (Etapa 08), e o banner só aponta para lá. A ação fica visível e desabilitada,
 * pelo mesmo motivo da aba ainda-a-chegar da página da competição.
 */
export function AvisoDeConclusao({ competicaoConcluida }: AvisoDeConclusaoProps) {
  if (!competicaoConcluida) return null

  return (
    <Alert tone="sucesso">
      <p className="font-medium">
        Competição concluída — todos os bimestres estão encerrados.
      </p>
      <p className="mt-1">
        A partir daqui o resultado é o do ano inteiro: a pontuação final de cada
        equipe é a soma das sínteses dos quatro bimestres.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="secondary" disabled title="Chega na Etapa 08">
          Ver o ranking final
        </Button>
        <span className="text-neutral-500 text-xs">
          Os rankings chegam na Etapa 08, na aba ao lado.
        </span>
      </div>
    </Alert>
  )
}
