import react from '@vitejs/plugin-react'
import { handleProduceSearchRequest } from './server/produce-search.js'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function jevSearchApi(): Plugin {
  let apiKey = ''

  const handler = (
    req: Parameters<typeof handleProduceSearchRequest>[0],
    res: Parameters<typeof handleProduceSearchRequest>[1],
  ) => handleProduceSearchRequest(req, res, apiKey)

  return {
    name: 'jev-search-api',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      apiKey = env.TYPESAFE_API_KEY || env.JEV_API_KEY || env.API_KEY || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/produce-search', (req, res) => {
        void handler(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/produce-search', (req, res) => {
        void handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), jevSearchApi()],
})
