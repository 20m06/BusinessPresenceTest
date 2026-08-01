# Business Visibility Test

A web tool that scores a local small business's online presence and returns a
prioritized, one-page action report. Built with Next.js, TypeScript, Tailwind
CSS, Supabase, and the Google Places / PageSpeed Insights APIs.

See `CLAUDE.md` for the full specification and `ROADMAP.md` for what is
deliberately out of scope in v1.

## Run locally

```
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values as each build phase
requires them. Never commit `.env.local`.
