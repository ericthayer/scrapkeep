# KeepSake

A storytelling scrapbook for concerts, conferences and family gatherings. Create an event, drop in photos, video, voice memos, scanned stubs and notes, and KeepSake lays them out as a day-by-day story. Each event is displayed as a **ticket** or a **gig poster**, and the whole thing prints (or saves as PDF) as a physical scrapbook page.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm test           # unit tests (vitest)
```

## How it works

| Concern | Approach |
| --- | --- |
| UI | Vanilla TypeScript Custom Elements (light DOM, `ks-` prefixed BEM classes, CSS `@layer`). No framework. |
| Tooling | Vite for dev server and build only; native ES modules; route views are code-split with dynamic `import()`. |
| Storage | IndexedDB, client-side only. `events`, `artifacts` (metadata, indexed by event) and `blobs` (media) are separate stores so listing never loads media. `navigator.storage.persist()` is requested on load. |
| State | `src/store/store.ts`: an `EventTarget` holding metadata in memory; components subscribe and re-render on `change`, coalesced per microtask and skipped when their `renderKey()` is unchanged. |
| Responsive | Container queries drive the ticket, poster, timeline and event layouts; type on tickets and posters scales with `cqi`, so one component serves thumbnail, hero and print. |
| Print / PDF | `#/print/:id` renders the cover (poster gets its own page; a ticket shares page one) followed by the story. It opens the print dialog once images decode; choose **Save as PDF**. |
| Accessibility | Native `<dialog>`, `<fieldset>`/`<legend>` radio groups, labelled controls, polite live region for status, focus moved to `<main>` on navigation, skip link, `prefers-reduced-motion` respected. axe-core reports zero WCAG 2.2 AA violations across all four palettes in light and dark mode. |

## Layout

```
src/
  types.ts                 domain model
  store/                   IndexedDB wrapper, object-URL cache, app store
  lib/                     DOM builder, formatting, router, form fields
  components/              one custom element per file, each with its own CSS
  styles/                  tokens, base, print
```

## Known limits (v1)

- Data lives only in the browser that created it. Clearing site data deletes the scrapbook; there is no export or sync yet.
- PDF goes through the browser print dialog. "Background graphics" must be on for poster and ticket colours.
- Video and audio print as labelled placeholders.
