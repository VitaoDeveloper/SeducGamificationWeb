import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Configuração do Vitest, separada da do Vite (`vite.config.ts`).
 *
 * Um arquivo só, em vez de um bloco `test` dentro do `vite.config.ts`: o plugin
 * do Tailwind não tem o que fazer em teste, e manter o servidor de plugins do
 * build fora da configuração de teste evita que os dois conjuntos cresçam juntos.
 * O plugin do React é o mesmo nos dois lados, e precisa estar aqui porque é ele
 * que converte o JSX dos arquivos `.spec.tsx`.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // `describe`/`it`/`expect` sem import, como no `SeducGamification` (API).
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      // A tela de login fala com a API real em desenvolvimento; em teste quem
      // responde é o msw. Definir a variável aqui evita o `console.warn` de
      // `src/lib/api.ts` sobre o `.env` não estar copiado.
      VITE_API_BASE_URL: 'http://localhost:3000',
    },
  },
})
