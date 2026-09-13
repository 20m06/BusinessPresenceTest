# The Storefront Index at DVC — Web Presence Scorecard

The audit instrument behind **The Storefront Index at DVC**, a student club at
Diablo Valley College. The club studies how small businesses across the San
Francisco Bay Area appear online — search visibility, listing accuracy, and
whether their websites function — using only publicly available information,
and publishes a regional report each semester for city governments, chambers of
commerce, and economic development offices.

This tool scores one business's online presence and returns a one-page report.

Nothing here is for sale. No business is charged, no service is offered, and
the club recommends no vendor — there is no pricing, no checkout, no booking
link, and no commercial mode anywhere in this codebase, by design rather than
by configuration. See `CLAUDE.md` §13.

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

## Contact

storefrontindexdvc@gmail.com · [@storefrontindexdvc](https://www.instagram.com/storefrontindexdvc/)
