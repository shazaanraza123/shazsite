# Sources

Research and design archive for Ye / Yeezy creative work. Image use is limited to **normal publicly available pages and assets**. Automated crawling was skipped wherever robots.txt, `x-robots-tag`, or platform terms disallow it.

Operator note: Shazaan123 states permission from the relevant site owners to use archival images in this project.

## Scraped (public pages / public catalog JSON)

| Source | Site | What was collected | Robots / terms |
| --- | --- | --- | --- |
| YZY Library | https://www.yzylibrary.com/ | Garment records, collections, lookbook galleries from public HTML/RSC. | `Allow: /` except `/admin` and `/api`. **`/api` was not requested.** |
| Yeezy Archive | https://yeezyarchive.net/ | Season / footwear / SZN / merch listing and detail HTML. Site credits merch imagery to Paris Saint. | No robots.txt document (404 HTML shell). Public pages only. |
| Paris Saint | https://www.parisaint.com/ | Public Shopify `products.json` / `collections.json` and product images. | `Allow: /`. Cart, checkout, account, `/cart.js` not used. |
| Ye Tracker | https://yetracker.cc/ | Public `/api/manifest` and `/api/tab/*` (same unauthenticated JSON the site loads). Art, misc, tracklists, special, samples, released, main, and other tabs. Tracker terminology and availability fields preserved. | robots.txt URL returns the SPA HTML shell (no Disallow policy). Images only from `yetracker.cc/img/`. Off-site leak hosts not followed. |
| Ye Tour | https://yetour.xyz/ | Public `/api/catalog/{year}` plus sitemap page URLs. Shows (setlist timestamps), merch stills, music stills. Videos not downloaded. | `User-agent: * Disallow: /admin/` only. `/admin` not requested. |

## Intentionally not crawled

| Source | URL | Why |
| --- | --- | --- |
| YZY TWTS | https://yzy-twts.com/ | `robots.txt` `User-agent: * Disallow: /`. Social posts remain a **research lead** only. |
| Ye Tracker (net) | https://yetracker.net/ | Google Sheets / Drive document; `x-robots-tag: noindex, nofollow, nosnippet`. Same tracker is published as a website on yetracker.cc. |
| Instagram @rckdmn | https://www.instagram.com/rckdmn/ | Instagram robots.txt: collection of data through automated means is prohibited without express written permission from Instagram. |
| Instagram @yzy.rchv | https://www.instagram.com/yzy.rchv/ | Same Instagram prohibition. Research lead for additional archival photography. |
| Reddit YZY Droam thread | https://www.reddit.com/r/Kanye/comments/1i6i5aq/yzy_droam_visualization_and_details/ | Reddit `User-agent: * Disallow: /` and Public Content Policy. Research lead for Droam visualization / details — do not ingest via crawler. |

## How to use the research leads (manual)

- **@rckdmn / @yzy.rchv** — browse as a human; if a post documents a garment, show, or artwork, add a record later with the Instagram URL as `source.url` and do not guess captions.
- **r/Kanye Droam thread** — read for cited filenames, dates, and diagrams; copy only facts the thread actually states into `source_claims` if you catalog Droam by hand.
- **YZY TWTS** — if the owners later allow a crawler user-agent, social records should store date, post text, attached media, original URL, and related project/era **only when the post itself establishes it**.

## Run

```bash
npm install
npm run archive
```

Outputs: `data/source-audit.json`, `data/archive.json`, `data/images.json`, `data/duplicates.json`, `data/scrape-report.json`, `public/archive/`, `figma-export/`, `FIGMA_IMAGE_GUIDE.md`.
