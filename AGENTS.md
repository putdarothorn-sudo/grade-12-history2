# Architecture

This project uses a static frontend without a build step. `public/index.html` contains the Khmer interface and social metadata. `public/style.css` defines the responsive navy and slate design; `public/app.js` handles the chat, native modal, Telegram share link, and browser notebook ID.

`netlify/functions/study.mts` accepts same-origin POST requests at `/api/study`. Its `save` action stores reference text and its `chat` action loads the latest eight notes for that browser notebook and calls Gemini through Netlify AI Gateway. Notes are unverified source data, never model instructions. The browser notebook ID is an unguessable capability, not a user account. Do not turn personal notes into a globally editable knowledge base.

`db/schema.ts` is the database schema source of truth. `db/index.ts` creates a Drizzle client inside the request flow. `drizzle.config.ts` targets `netlify/database/migrations`; generate migrations after schema changes and let Netlify apply them. Drizzle uses the beta packages required by the Netlify adapter.

Keep UI copy in Khmer, render messages with textContent, and keep provider credentials server-side. Do not fabricate citations or claim that an official book was uploaded. Preserve accessible labels, keyboard focus, dialog behavior, reduced-motion handling, and mobile layouts. No generated images are necessary. Never add an og:image; the platform supplies it.

No build command is needed. Netlify publishes `public` and bundles the TypeScript function using esbuild. Run locally using `netlify dev --port 8889` when authorized by the active platform instructions.
