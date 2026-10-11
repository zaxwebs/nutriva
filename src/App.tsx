import { useState, type FormEvent } from 'react'
import { fruits, produce, vegetables } from './data.js'

type ProduceItem = (typeof produce)[number]

type SearchResponse = {
  items?: Array<{ name?: string; probability?: number }>
  error?: string
}

function formatGrams(value: number) {
  const places = value < 1 ? 2 : 1
  return `${Number(value.toFixed(places))} g`
}

type NutrientTone = 'energy' | 'carbs' | 'fiber'

function NutrientValue({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: NutrientTone
}) {
  return (
    <span className={`nutrient-value nutrient-value--${tone}`} aria-label={`${label}: ${value}`}>
      <span className="nutrient-value__dot" aria-hidden="true" />
      <strong>{value}</strong>
    </span>
  )
}

function ProduceItemRow({ item }: { item: ProduceItem }) {
  const nutrition = item.nutritionPerServing
  const imageName = item.name.toLowerCase().replaceAll(' ', '-')
  const serving = item.serving.replace(/\s*\(\d+\s*g\)$/i, '')

  return (
    <div className="produce-item">
      <div className="produce-image-wrap">
        <img
          src={`/images/produce/${imageName}.avif`}
          alt=""
          width="72"
          height="72"
        />
      </div>
      <div className="produce-copy">
        <div className="produce-heading">
          <div>
            <h3>{item.name}</h3>
            <p className="produce-serving">{serving}</p>
          </div>
          <span className="serving-weight">{item.servingWeightG} g</span>
        </div>
        <div className="nutrient-values" aria-label="Nutrition highlights">
          <NutrientValue
            label="Calories"
            value={`${Math.round(nutrition.caloriesKcal)} kcal`}
            tone="energy"
          />
          <NutrientValue
            label="Carbohydrates"
            value={`${formatGrams(nutrition.carbsG)} carbs`}
            tone="carbs"
          />
          <NutrientValue
            label="Fiber"
            value={`${formatGrams(nutrition.fiberG)} fiber`}
            tone="fiber"
          />
        </div>
        <p className="nutrition-details">
          <span className="nutrition-detail nutrition-detail--sugar">
            <span className="nutrition-detail__dot" aria-hidden="true" />
            <span>Sugar <strong>{formatGrams(nutrition.sugarG)}</strong></span>
          </span>
          <span className="nutrition-detail nutrition-detail--protein">
            <span className="nutrition-detail__dot" aria-hidden="true" />
            <span>Protein <strong>{formatGrams(nutrition.proteinG)}</strong></span>
          </span>
          <span className="nutrition-detail nutrition-detail--fat">
            <span className="nutrition-detail__dot" aria-hidden="true" />
            <span>Fat <strong>{formatGrams(nutrition.fatG)}</strong></span>
          </span>
        </p>
        <p className="micronutrient-details">{item.micronutrientsPerServing.join(' · ')}</p>
      </div>
    </div>
  )
}

function ProduceSection({ title, items }: { title: string; items: ProduceItem[] }) {
  return (
    <section className="produce-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="items-count">{items.length} items</span>
      </div>
      <ul className="produce-list">
        {items.map((item) => (
          <li key={item.name}>
            <ProduceItemRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<ProduceItem[]>([])
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  async function searchProduce(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const searchTerm = query.trim()
    if (!searchTerm || isSearching) return

    setMatches([])
    setError('')
    setIsSearching(true)

    try {
      const response = await fetch('/api/produce-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm }),
      })
      const result = (await response.json()) as SearchResponse

      if (!response.ok) {
        throw new Error(result.error || 'Search failed. Please try again.')
      }

      const rankedItems = result.items
        ?.map(({ name }) => produce.find((item) => item.name === name))
        .filter((item): item is ProduceItem => Boolean(item))
      if (!rankedItems || rankedItems.length !== 10) {
        throw new Error('AI did not return 10 matching produce items. Please try again.')
      }
      setMatches(rankedItems)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit">
            <div className="hero-orbit-point hero-orbit-point--lychee">
              <img className="hero-produce hero-produce--lychee" src="/images/produce/lychee.avif" alt="" />
            </div>
            <div className="hero-orbit-point hero-orbit-point--spinach">
              <img className="hero-produce hero-produce--spinach" src="/images/produce/spinach.avif" alt="" />
            </div>
            <div className="hero-orbit-point hero-orbit-point--peach">
              <img className="hero-produce hero-produce--peach" src="/images/produce/peach.avif" alt="" />
            </div>
            <div className="hero-orbit-point hero-orbit-point--mango">
              <img className="hero-produce hero-produce--mango" src="/images/produce/mango.avif" alt="" />
            </div>
          </div>
        </div>
        <h1 className="hero-title">Your personal produce specialist.</h1>
        <p className="hero-powered">Powered by (ultra-fast) AI</p>
      </header>

      <section className="search-section" aria-label="Search produce">
        <form className="search-form" onSubmit={searchProduce}>
          <label className="visually-hidden" htmlFor="produce-query">What are you looking for?</label>
          <div className="search-controls">
            <input
              id="produce-query"
              name="query"
              type="search"
              maxLength={200}
              placeholder="What should your food do for you? e.g. improve eye health"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              required
            />
            <button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? 'Searching…' : 'Ask AI'}
            </button>
          </div>
        </form>

        {error && <p className="search-error" role="alert">{error}</p>}
        {matches.length > 0 && (
          <div className="search-result" aria-live="polite">
            <h3>Top 10 matches</h3>
            <ul className="search-result-list">
              {matches.map((item) => (
                <li key={item.name}>
                  <ProduceItemRow item={item} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ProduceSection title="Fruits" items={fruits} />
      <ProduceSection title="Vegetables" items={vegetables} />

      <footer className="site-footer">
        <p>
          Designed and developed by{' '}
          <a href="https://zackwebster.com/" target="_blank" rel="noreferrer">
            Zack Webster
          </a>
        </p>
      </footer>
    </main>
  )
}

export default App
