import react from '@vitejs/plugin-react'
import { fruits, produce, vegetables } from './src/data.js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'

type ProduceItem = (typeof produce)[number]

type JevResponse = {
  answers?: {
    best_match?: {
      choice?: string
      confidence?: number
      probabilities?: Record<string, number>
    }
  }
}

const produceByChoice = new Map(
  [...fruits, ...vegetables].map((item) => [toChoice(item.name), item]),
)

function toChoice(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

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
  let keyStatus: 'missing' | 'configured' = 'missing'

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      respond(res, 405, { error: 'Use POST to search produce.' })
      return
    }

    if (keyStatus === 'missing') {
      respond(res, 503, {
        error: 'Add a TypeSafe API key to TYPESAFE_API_KEY in .env.local to enable search.',
      })
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

    if (typeof query !== 'string' || !query.trim() || query.length > 200) {
      respond(res, 400, { error: 'Enter a search query up to 200 characters.' })
      return
    }

    const criteria = Object.fromEntries(
      produce.map((item: ProduceItem) => [toChoice(item.name), item.name]),
    )

    try {
      const upstream = await fetch('https://api.typesafe.ai/v1/systemone', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'jev-latest',
          state: {
            userQuery: query.trim(),
          },
          questions: {
            best_match: {
              type: 'choice',
              instructions:
                'Interpret the user query as either a specific produce request or a nutrition goal describing what they want food to support.',
              criteria,
            },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      })

      if (!upstream.ok) {
        let error = `AI could not complete the search (HTTP ${upstream.status}). Try again.`
        if (upstream.status === 401) {
          error = 'TypeSafe rejected the configured API key. Check TYPESAFE_API_KEY in .env.local.'
        } else if (upstream.status === 402) {
          error = 'The AI API key has no available balance for this search.'
        } else if (upstream.status === 429) {
          error = 'AI search is temporarily rate limited. Try again shortly.'
        }
        respond(res, upstream.status === 429 ? 429 : 502, { error })
        return
      }

      const data = (await upstream.json()) as JevResponse
      const answer = data.answers?.best_match
      const choice = answer?.choice
      const probabilities = answer?.probabilities

      if (!choice || !probabilities) {
        respond(res, 502, { error: 'AI did not return a ranked list. Try again.' })
        return
      }

      const rankedItems = Object.entries(probabilities)
        .map(([option, probability]) => ({
          item: produceByChoice.get(option),
          probability,
        }))
        .filter((entry): entry is { item: ProduceItem; probability: number } => Boolean(entry.item))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 10)

      if (rankedItems.length < 10 || !rankedItems.some(({ item }) => item.name === produceByChoice.get(choice)?.name)) {
        respond(res, 502, { error: 'AI returned an incomplete ranking. Try again.' })
        return
      }

      respond(res, 200, {
        items: rankedItems.map(({ item, probability }) => ({
          name: item.name,
          probability,
        })),
      })
    } catch {
      respond(res, 502, { error: 'AI search is temporarily unavailable. Try again.' })
    }
  }

  return {
    name: 'jev-search-api',
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      apiKey = env.TYPESAFE_API_KEY || env.JEV_API_KEY || env.API_KEY || ''
      keyStatus = apiKey ? 'configured' : 'missing'
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
