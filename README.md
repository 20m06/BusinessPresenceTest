# Pro Bono Consulting — Web Presence Scorecard

Free audit software for **Pro Bono Consulting**, a student club at Diablo
Valley College. It scores a local small business's online presence and returns
a prioritized, one-page action report.

The service is free and always will be. Nothing is sold and nothing is
charged — there is no pricing, no checkout, and no commercial mode anywhere in
this codebase, by design rather than by configuration.

Built with Next.js, TypeScript, Tailwind CSS, Supabase, and the Google Places /
PageSpeed Insights APIs.

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
