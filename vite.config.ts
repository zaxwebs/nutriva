import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { searchProduce } from './server/produce-search.js'
import { defineConfig, loadEnv, type Plugin } from 'vite'

function respond(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    size += buffer.length
    if (size > 8_192) throw new Error('request_too_large')
    chunks.push(buffer)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function jevSearchApi(): Plugin {
  let apiKey = ''

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      respond(res, 405, { error: 'Use POST to search produce.' })
      return
    }

    let query: unknown
    try {
      const body = await readJson(req)
      query = typeof body === 'object' && body !== null && 'query' in body
        ? (body as { query: unknown }).query
        : undefined
    } catch (error) {
      const status = error instanceof Error && error.message === 'request_too_large' ? 413 : 400
      respond(res, status, { error: status === 413 ? 'Search query is too long.' : 'Send a valid JSON body.' })
      return
    }

    const result = await searchProduce(query, apiKey)
    respond(res, result.status, result.body)
  }

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
