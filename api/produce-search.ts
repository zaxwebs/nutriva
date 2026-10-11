import type { ServerResponse } from 'node:http'
import { handleProduceSearchRequest, type ProduceSearchRequest } from '../server/produce-search.js'

export default async function handler(req: ProduceSearchRequest, res: ServerResponse) {
  const apiKey = process.env.TYPESAFE_API_KEY || process.env.JEV_API_KEY || process.env.API_KEY || ''
  await handleProduceSearchRequest(req, res, apiKey)
}
