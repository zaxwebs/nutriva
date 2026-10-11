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
