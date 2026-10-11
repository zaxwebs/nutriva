import type { IncomingMessage, ServerResponse } from 'node:http'
import { produce } from '../src/data.js'

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

export type ProduceSearchResult = {
  status: number
  body: {
    error?: string
    items?: Array<{ name: string; probability: number }>
  }
}

const produceByChoice = new Map(produce.map((item) => [toChoice(item.name), item]))

function toChoice(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export type ProduceSearchRequest = IncomingMessage & { body?: unknown }

function respond(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

async function readRequestBody(req: ProduceSearchRequest) {
  if ('body' in req) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      const rawBody = typeof req.body === 'string' ? req.body : req.body.toString('utf8')
      if (Buffer.byteLength(rawBody) > 8_192) throw new Error('request_too_large')
      return JSON.parse(rawBody) as unknown
    }

    return req.body
  }

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

export async function handleProduceSearchRequest(
  req: ProduceSearchRequest,
  res: ServerResponse,
  apiKey: string,
) {
  if (req.method !== 'POST') {
    respond(res, 405, { error: 'Use POST to search produce.' })
    return
  }

  let query: unknown
  try {
    const body = await readRequestBody(req)
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

export async function searchProduce(query: unknown, apiKey: string): Promise<ProduceSearchResult> {
  if (!apiKey) {
    return {
      status: 503,
      body: { error: 'Configure TYPESAFE_API_KEY in your environment to enable search.' },
    }
  }

  if (typeof query !== 'string' || !query.trim() || query.length > 200) {
    return { status: 400, body: { error: 'Enter a search query up to 200 characters.' } }
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
        error = 'TypeSafe rejected the configured API key. Check TYPESAFE_API_KEY in your deployment environment.'
      } else if (upstream.status === 402) {
        error = 'The AI API key has no available balance for this search.'
      } else if (upstream.status === 429) {
        error = 'AI search is temporarily rate limited. Try again shortly.'
      }
      return { status: upstream.status === 429 ? 429 : 502, body: { error } }
    }

    const data = (await upstream.json()) as JevResponse
    const answer = data.answers?.best_match
    const choice = answer?.choice
    const probabilities = answer?.probabilities

    if (!choice || !probabilities) {
      return { status: 502, body: { error: 'AI did not return a ranked list. Try again.' } }
    }

    const rankedItems = Object.entries(probabilities)
      .map(([option, probability]) => ({
        item: produceByChoice.get(option),
        probability,
      }))
      .filter((entry): entry is { item: ProduceItem; probability: number } =>
        Boolean(entry.item) && entry.probability > 0,
      )
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10)

    const chosenItem = produceByChoice.get(choice)
    if (!rankedItems.length || !rankedItems.some(({ item }) => item.name === chosenItem?.name)) {
      return { status: 502, body: { error: 'AI returned an incomplete ranking. Try again.' } }
    }

    return {
      status: 200,
      body: {
        items: rankedItems.map(({ item, probability }) => ({
          name: item.name,
          probability,
        })),
      },
    }
  } catch {
    return { status: 502, body: { error: 'AI search is temporarily unavailable. Try again.' } }
  }
}
