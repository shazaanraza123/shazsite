# YE ARCHIVE

Connected digital archive of Ye’s documented creative work. This repository is the archive site, not a personal portfolio.

## Site

```bash
npm install
npm run index    # derive public/search-index.json from data/archive.json
npm run dev
```

Production: `npm run build`. Desktop-first ~1440px.

Routes: `/` entry · `/archive` field · `/era/yeezus` · `/record/:id` · `/music` · `/fashion/regular-fit-ls-tee-h03` · `/unrealized` · `/connections` · `/search` (`/` key).

Local images only (`public/archive/`, `figma-export/`). Search queries a slim index — it does not render 28k records at once.

## Scrape (do not rerun unless asked)

`npm run archive` audits robots.txt and crawls permitted public sources into `data/`, `public/archive/`, and `figma-export/`. See `SOURCES.md` and `FIGMA_IMAGE_GUIDE.md`.
