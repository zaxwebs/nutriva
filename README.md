# Nutriva

Nutriva is a fast, AI-powered guide to fruits and vegetables. Search for a specific item or describe what you want food to support—such as “improve eye health”—and get a ranked list of produce that fits.

ChatGPT is built for broad conversations; Nutriva is built for this one task. It sends Jev a short query and a compact list of produce names, then returns matching options directly. That focused request avoids prompt crafting and extra back-and-forth, making produce suggestions quick to scan. Each result includes nutrition per common serving, including calories, carbs, fiber, sugar, protein, fat, and notable vitamins and minerals.

The catalog includes 40 fruits and 40 vegetables, with an image and approximate nutrition information for each.

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
