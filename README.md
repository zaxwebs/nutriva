# Nutriva

### Your personal produce specialist.

Powered by ultra-fast AI.

Discover the best fruits and vegetables for your health goals. Whether you're looking to improve eye health, support better sleep, or boost your energy, simply tell us what you want to achieve and we'll find the foods that can help.

**Better health starts with better food.**

## Getting started

```sh
npm install
npm run dev
```

## AI search

For local development, add a TypeSafe API key to `.env.local`:

```sh
TYPESAFE_API_KEY=your_key_here
```

The key stays on the server and is never sent to the browser. Vite serves
`/api/produce-search` locally, and `api/produce-search.ts` provides the same
endpoint as a Vercel serverless function in production. In Vercel, add
`TYPESAFE_API_KEY` under **Project Settings → Environment Variables**, then
redeploy.

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` type-checks the app and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs Oxlint.

The main app lives in `src/`. Update `src/App.tsx` to build the UI.

The produce dataset is in `src/data.js`. It exports `fruits`, `vegetables`, and the combined `produce` list. Each item includes a common serving, its weight, approximate nutrition values for that serving, and approximate amounts for notable vitamins and minerals.

Images from [Thiings](https://www.thiings.co/things) are saved as transparent 400 × 400 AVIF files in `public/images/produce/`. Closest matches are used for red bell pepper, kale, green peas, sweet lime, green chili, okra, amla (grapes), jamun and mulberry (blackberry), ber (plum), and muskmelon (cantaloupe).

For vegetables, bottle, ridge, and pointed gourds use zucchini; bitter, snake, and ivy gourds use cucumber; ash gourd uses pumpkin; drumstick pods and French beans use white asparagus; raw banana uses banana; taro root and yam use purple yam; cluster beans use green peas; curry leaves use coriander leaves.
