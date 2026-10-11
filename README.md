# Nutriva

React and TypeScript app powered by Vite.

## Getting started

```sh
npm install
npm run dev
```

## AI search

Add a TypeSafe API key to `.env.local` as `TYPESAFE_API_KEY=...`. The key stays
in the Vite server and is never sent to the browser. The local dev and preview
servers provide the search endpoint; a deployed static build needs an equivalent
server-side endpoint.

## Scripts

- `npm run dev` starts the local development server.
- `npm run build` type-checks the app and creates a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs Oxlint.

The main app lives in `src/`. Update `src/App.tsx` to build the UI.

The produce dataset is in `src/data.js`. It exports `fruits`, `vegetables`, and the combined `produce` list. Each item includes a common serving, its weight, approximate nutrition values for that serving, and approximate amounts for notable vitamins and minerals.

Images from [Thiings](https://www.thiings.co/things) are saved as transparent 400 × 400 AVIF files in `public/images/produce/`. Closest matches are used for red bell pepper, kale, green peas, sweet lime, green chili, okra, amla (grapes), jamun and mulberry (blackberry), ber (plum), and muskmelon (cantaloupe).

For vegetables, bottle, ridge, and pointed gourds use zucchini; bitter, snake, and ivy gourds use cucumber; ash gourd uses pumpkin; drumstick pods and French beans use white asparagus; raw banana uses banana; taro root and yam use purple yam; cluster beans use green peas; curry leaves use coriander leaves.
