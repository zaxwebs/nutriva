import type { IncomingMessage, ServerResponse } from 'node:http'
import { searchProduce } from '../server/produce-search.js'

type VercelRequest = IncomingMessage & { body?: unknown }

function respond(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function extractQuery(body: unknown) {
  let parsed = body
  if (typeof body === 'string') {
    try {
      parsed = JSON.parse(body) as unknown
    } catch {
      return undefined
    }
  }

  return typeof parsed === 'object' && parsed !== null && 'query' in parsed
    ? (parsed as { query: unknown }).query
    : undefined
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    respond(res, 405, { error: 'Use POST to search produce.' })
    return
  }

  const apiKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY || process.env.API_KEY || ''
  const result = await searchProduce(extractQuery(req.body), apiKey)
  respond(res, result.status, result.body)
}
