# AGENTS.md — Whiting.me

Mark E. Whiting's personal website: a Jekyll site deployed to GitHub Pages using the Minima theme with custom styling. Content includes the homepage, bio, an academic CV, FAQ, and blog posts.

This file is the primary orientation for AI coding agents working in this repo. Read it first; only fall back to broader searches when something here is missing or contradicted by what you find.

## Quick reference

- **Stack:** Jekyll (Ruby) + Minima theme + custom SCSS, plus Node-based Playwright-style integration tests.
- **Deploy target:** GitHub Pages (custom domain via `CNAME`).
- **Ruby:** 3.2 (matches CI).
- **Node:** any recent LTS is fine for running `npm test`.

## Working effectively (local, macOS)

Install and build:

```sh
bundle config set --local path 'vendor/bundle'
bundle install              # ~30s the first time — do not cancel; allow 90s+
bundle exec jekyll build    # ~2s
```

Run the dev server:

```sh
bundle exec jekyll serve --host 0.0.0.0 --port 4000
# http://localhost:4000 — Ctrl+C to stop
```

If `bundler` itself is missing: `gem install --user-install bundler` and make sure the user gem `bin` dir is on `PATH`.

## Tests

There is a Node-based test suite under `tests/` (driven via `package.json`). These are integration checks that hit a running site, so **start `jekyll serve` first**, then in another shell:

```sh
npm test                 # runs all suites in order
npm run test:urls        # url-collision-test.js
npm run test:basic       # basic-test.js
npm run test:footer      # footer-test.js
npm run test:cv          # cv-test.js
npm run test:print       # print-styles-test.js
npm run test:colors      # color-space-test.js
```

Reports land in `playwright-report/` (gitignored / build artefact — do not commit). When fixing a failing test, prefer fixing the site/content over loosening the assertion.

## Validation checklist

After any non-trivial change, run through this before handing the change back:

1. `bundle exec jekyll build` succeeds with no errors/warnings.
2. `bundle exec jekyll serve` starts cleanly.
3. Visit the key pages and confirm they render:
   - `/` (homepage)
   - `/bio/`
   - `/cv/`
   - `/faq/`
   - `/posts/` (archive)
4. Navigation links between those pages work.
5. If you touched anything under `tests/` scope (CV, footer, print styles, colors, URLs, general layout), run the relevant `npm run test:*` suite.
6. No broken images or obviously missing assets.

## Repository layout

```
.
├── _config.yml           # Jekyll configuration (permalink: /:title/)
├── Gemfile / Gemfile.lock
├── package.json          # Node test runner scripts
├── index.md              # Homepage
├── bio.md                # Bio page
├── cv.html               # CV page (renders _data/CV.csv)
├── faq.md                # FAQ page
├── posts.html            # Post archive
├── bib.html, chat.html, feedback.html, goals.html, meet.html, 404.html
├── _posts/               # Blog posts: YYYY-MM-DD-title.markdown
├── _layouts/             # Page templates (default.html, post.html, ...)
├── _includes/            # Reusable partials
├── _sass/                # SCSS overrides on top of Minima
├── _data/                # Structured content (CV.csv, mentees.yml, ...)
├── assets/               # Images, CSS, JS
├── tests/                # Node integration tests
├── .github/workflows/    # CI (Jekyll build + Pages deploy)
├── old/                  # Legacy/archived content — do not rely on or modify without reason
└── vendor/, node_modules/, _site/, .sass-cache/, playwright-report/   # all build/output, gitignored
```

### Key config

`_config.yml` sets the site metadata, `permalink: /:title/` (clean title-based URLs), `theme: minima`, and plugins `jekyll-feed` and `jekyll-sitemap`. If you add a plugin, add it both here and to the `Gemfile`.

`Gemfile` uses `github-pages` (so local versions track what Pages builds with), plus `minima`, `jekyll-feed`, and `webrick`.

## Content conventions

### Blog posts

- Live in `_posts/` and must be named `YYYY-MM-DD-title.markdown`.
- Require YAML front matter with at least `title`, `date`, and `categories`.
- Final URL is `/:title/` (set globally), so keep the slug portion unique and URL-safe.
- When adding a post, consider running `npm run test:urls` to catch collisions with existing pages.

### Pages

- New top-level pages can be `.md` or `.html` at the repo root.
- Use `layout:` front matter to pick a layout from `_layouts/`.
- Prefer Markdown for text-heavy pages and HTML for pages with structural/layout logic (as `cv.html` and `bib.html` do).

### Styling

- Customisations live in `_sass/`; don't edit the Minima gem directly.
- Print styles are exercised by `tests/print-styles-test.js` — validate there after print-related tweaks.
- Color-space assumptions are exercised by `tests/color-space-test.js`.

## CV data authoring (`_data/CV.csv`)

The CV template renders each row as:

```
{position} [in {focus}] at {institutionFull} ({institutionShort}) {notes}
```

**`institutionFull` is always the host/parent body** — the organisation or conference that is ultimately responsible for the event. Specific event details belong in `position` or `focus`, never in `institutionFull`.

### Field usage by case

| Case | position | focus | institutionFull | institutionShort | notes |
|---|---|---|---|---|---|
| Simple role at an org | `Senior Scientist` | — | `University of Pennsylvania` | `U Penn` | extra detail |
| Role at a sub-event of a conference | `Panelist at AAAI 2025 Workshop on A Translational Institute for Knowledge Axiomatization` | — | `The 39th Annual AAAI Conference on Artificial Intelligence` | `AAAI` | — |
| Role within a track at a conference | `Doctoral Colloquium Mentor` | — | `AAAI Conference on Human Computation and Crowdsourcing` | `HCOMP` | — |
| Role in a specific chapter/sub-group | `Participant` | `the Duke chapter` | `Summer Institute in Computational Social Science` | `SICSS` | — |
| Role at a workshop hosted by an external org | `Panelist at the Changing Nature of Work Workshop` | — | `Center for Work Technology and Organization` | `WTO` | `at Stanford University` |

### Key rules

- **Never put a workshop or sub-event name as `institutionFull`.** Put it in `position` instead (e.g. `Panelist at [Workshop Name]`).
- **`institutionShort` is the abbreviation of `institutionFull`** (the host), never of the sub-event or workshop. Never include the year (use `AAAI`, not `AAAI-25`).
- **`focus`** is only for a sub-track/chapter/specialisation within the institution (rendered as `in {focus}`).
- **`notes`** is for extra location or context that doesn't fit the main pattern (e.g. `at Stanford University`). Don't use it to re-state the institution or workshop.
- **Date range:** if `dateStart` and `dateEnd` are in the same calendar year, only that year shows. If `dateEnd` is empty, an arrow (`→`) indicates ongoing. For one-off events, set `dateEnd = dateStart` to avoid the arrow.

After editing `CV.csv`, run `npm run test:cv` against a running dev server.

## CI/CD

- Workflow: `.github/workflows/jekyll.yml`.
- Triggered on push (see the workflow for the exact branch).
- Uses `ruby/setup-ruby@v1` with Ruby 3.2 and bundler caching.
- Build command: `bundle exec jekyll build --future` (note `--future` — scheduled future-dated posts are included).
- Deploy: `actions/deploy-pages@v4` to GitHub Pages.
- Jobs: **build**, **deploy**, **test**.

If something builds locally but fails in CI, first check the Ruby/bundler versions and whether a gem is missing from the `Gemfile` (local `vendor/bundle` can hide that).

## Troubleshooting

- **`bundle install` permission errors:** use `--user-install` for bundler, and make sure the user gem `bin` is on `PATH`. Project gems always install under `vendor/bundle/` thanks to the local bundler config.
- **Port 4000 in use:** `bundle exec jekyll serve --port 4001`.
- **Build errors:** almost always a YAML front-matter typo in a post/page, or an unclosed Liquid tag.
- **Broken styling:** check recent edits in `_sass/`; make sure SCSS compiles and doesn't shadow a Minima partial by accident.
- **Tests failing locally:** confirm the dev server is actually running on `http://localhost:4000` and that you're not hitting a stale `_site/` from a previous branch (delete `_site/` and rebuild if unsure).

## Expected timings

- `bundle install` (cold): ~30s — do not cancel; allow 90s+.
- `bundle install` (warm): seconds.
- `bundle exec jekyll build`: ~2s.
- `bundle exec jekyll serve` startup: 2–3s.
- Full `npm test` suite: well under a minute against a running local server.
- CI end-to-end: 1–2 minutes.

## Conventions for agents

- **Don't commit generated output.** `_site/`, `vendor/`, `node_modules/`, `.sass-cache/`, `playwright-report/` are all build artefacts.
- **Don't modify `old/`** unless the task is explicitly about it. It's archival.
- **Keep commits scoped.** Content edits, layout/style changes, and test changes are three different kinds of change; keep PRs/commits coherent.
- **Prefer editing over rewriting.** Especially for `_layouts/`, `_includes/`, and `_sass/`, small diffs are much easier to review than wholesale rewrites.
- **When in doubt about CV formatting,** re-read the "CV data authoring" section above before guessing.
