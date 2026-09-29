import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // A API libera CORS apenas para http://localhost:5173. Se a porta 5173
    // estiver ocupada e o Vite cair para a 5174, o navegador bloqueia o
    // preflight e a interface deixa de falar com a API. Com strictPort, o dev
    // server falha na inicialização em vez de subir em outra porta calada.
    port: 5173,
    strictPort: true,
  },
})
