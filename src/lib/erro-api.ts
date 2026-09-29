import { AxiosError } from 'axios'

/**
 * Extrai a mensagem de erro de uma resposta da API.
 *
 * O NestJS responde com `{ statusCode, message, error }`, e `message` é string
 * nas exceções da aplicação (`Sala não encontrada.`) mas vira array quando vem do
 * ValidationPipe, com um item por campo inválido. Por isso os dois formatos são
 * tratados aqui, e nenhuma tela precisa saber desse detalhe.
 */
export function mensagemDeErro(erro: unknown, alternativa: string): string {
  if (!(erro instanceof AxiosError)) {
    return alternativa
  }

  const { data } = erro.response ?? {}
  const mensagem = (data as { message?: unknown } | undefined)?.message

  if (typeof mensagem === 'string') return mensagem
  if (Array.isArray(mensagem)) return mensagem.join(' ')

  if (erro.code === 'ECONNABORTED') return 'A requisição demorou demais. Tente de novo.'
  if (erro.message === 'Network Error') return 'Não foi possível falar com o servidor.'

  return alternativa
}
