# Grove Website — Shooting Guide

Demo universe is **two projects** (Grove has two project types):

- **notekeeper** — *Repo* project, hosts **Coding Tasks**. Core feature set: Review, Chat, Terminal, Editor, Git, Merge, Statistics.
- **notekeeper-studio** — *Studio* project, hosts **Studio Tasks**. Core feature set: Sketch, Memory, Resources, Artifacts (output/), Shared Assets.

Stay consistent so the site tells one coherent story. Both projects already exist and are populated (see Part A).

---

## Part A — The Demo Universe

### Project 1 · Repo project: **notekeeper**

- Type: `repo` (Git worktree-based)
- Path: `/Users/bytedance/tmp/notekeeper`
- Grove ID: `a8a8ba135132cbfd`
- What it is: a Rust (Axum) + React team notes web app

**Coding Tasks** (already created, worktrees live under `~/.grove/worktrees/a8a8ba135132cbfd/<task>`):

| Task | Branch | Purpose in screenshots | State |
|---|---|---|---|
| `auth-refactor` | `grove/auth-refactor-…` | Hero / Blitz / Chat — agent "busy" (start a Claude session live before shooting) | Has WIP commit: `SessionStore` scaffold |
| `perf-hotfix` | `grove/perf-hotfix-…` | Blitz / parallel work — agent "busy" (start a Codex session live) | Clean worktree (just spec) |
| `landing-copy` | `grove/landing-copy-…` | **Review / Ship workflow** — has a full reviewable diff | Commit: rewrote `HeroSection.tsx` per STYLE.md |
| `sketch-panel` | `grove/sketch-panel-…` | Blitz archived / Statistics | Clean worktree — plan is to **merge this via UI** to create merged history |

### Project 2 · Studio project: **notekeeper-studio**

- Type: `studio` (folder-based, no git worktree)
- Virtual path: `studio://notekeeper-studio`
- Grove ID: `ed3b86086b3e5dd8`
- FS location: `~/.grove/studios/ed3b86086b3e5dd8/`
- Has populated `memory.md`, `instructions.md`, and `resource/` files

**Studio Tasks** (already created):

| Task | Purpose in screenshots | State |
|---|---|---|
| `brand-refresh` | **Studio hero / Sketch / Artifacts** — main Studio demo | `input/refresh-brief.md`, `output/hero-variants.md` populated. Needs a sketch drawn named `hero-layout` |
| `onboarding-flow` | Secondary task for "multiple Studio tasks" shot | `input/onboarding-brief.md` populated |

### Review comments to add (in UI) on the Coding Task `landing-copy`

Open the Review panel for `landing-copy`. The diff will show `HeroSection.tsx` changes. Add:

1. `web/src/HeroSection.tsx` line 9 — *open*
   > "Love the three-verb rhythm. Is this the variant we picked in `brand-refresh`?"
2. `web/src/HeroSection.tsx` line 13 — *AI-fixer resolved*
   > "Check 'you're' vs 'your' — this is fine, just verifying."
3. `web/src/HeroSection.tsx` — *file-level thread, 2 replies*
   > User: "Should we add a data-testid on the `cta` button?"
   > Agent: "Yes — I'll add `data-testid=\"hero-cta\"` in the next commit."

### Sketches to draw (in UI) on the Studio Task `brand-refresh`

Draw two sketches in the Sketch panel:

1. **`hero-layout`** — three stacked rectangles labeled `LOGO`, `HEADLINE`, `CTA`. Arrow from `HEADLINE` with a text callout "≤ 60 chars, warm + direct verb pattern".
2. **`brand-pillars`** — three circles in a row labeled `WARM`, `DIRECT`, `SPECIFIC`. Overlapping Venn-style.

### Shared Assets to add (in Studio `notekeeper-studio`)

Already on disk, should show up in the file manager:
- `resource/STYLE.md`
- `resource/brand-palette.md`

You can also drag-drop any logo PNG into `resource/` so a non-markdown file shows.

---

## Part B — Asset Shoot Order

Priority: Tier 1 heroes first, then details, then supporting cards.

### Tier 1 — Heroes (5 shots)

| # | Filename | Page | Project / Task | Dims |
|---|---|---|---|---|
| 1 | `home-hero-studio.png` | `/` Home hero | **Studio · notekeeper-studio → `brand-refresh`** · Sketch canvas main + Chat dock | 1600 × 1000 |
| 2 | `agents-hero-parallel.gif` | `/agents` hero | Blitz view with multiple notekeeper Coding Tasks running | 1200 × 720 |
| 3 | `studio-hero.png` | `/studio` hero | Studio file manager main + Memory editor side — same project, different angle | 1400 × 788 |
| 4 | `anywhere-hero-collage.png` | `/anywhere` hero | Composite: web IDE (largest) + native window + phone + small TUI | 1600 × 900 |
| 5 | `extend-skills-market.png` | `/extend` hero | Skills marketplace page | 1400 × 788 |

**Why Home hero is Studio, not Code Review:** Studio is Grove's most differentiated surface — no other dev tool has this. It frames the product around "AI workspace for everyone" instead of "code review tool", which matches the positioning (*AI development, for everyone — not just coders*). Code Review gets its dedicated showcase on `/workflow` with rich diff + multi-agent comments.

### Tier 2 — Detail showcases (10 shots)

| # | Filename | Page | Project / Task | Dims |
|---|---|---|---|---|
| 6 | `home-agents-blitz.png` | `/` Home §2 | Blitz across notekeeper tasks | 1200 × 900 |
| 7 | `home-studio-overview.png` | `/` Home §3 | Studio `brand-refresh` — file manager + editor open on `hero-variants.md` | 1200 × 900 |
| 8 | `home-anywhere-surfaces.png` | `/` Home §4 | 4-surface composite | 1200 × 900 |
| 9 | `home-workflow-review.png` | `/` Home §5 | Review panel of **`auth-refactor`** with the 8 multi-agent comments visible | 1200 × 900 |
| 10 | `home-extend-skills.png` | `/` Home §6 | Skills marketplace | 1200 × 900 |
| 11 | `agents-blitz.png` | `/agents` §2 | Blitz view | 1200 × 900 |
| 12 | `studio-resources.png` | `/studio` §1 | Studio resource panel showing `resource/STYLE.md` + `brand-palette.md`; editor open on brand-palette table | 960 × 720 |
| 13 | `studio-memory.png` | `/studio` §2 | Studio memory.md editor with preview toggle — shows the "notekeeper — Project Memory" content | 960 × 720 |
| 14 | `workflow-review.png` | `/workflow` §3 | **`auth-refactor`** Review dominant, Gemini's atomicity comment thread expanded (comment #3) | 1100 × 825 |
| 15 | `workflow-stats.png` | `/workflow` §5 | Statistics page for notekeeper | 1200 × 900 |

### Tier 3 — Supporting (10 shots + GIFs)

| # | Filename | Page | Notes |
|---|---|---|---|
| 16 | `agents-custom-picker.png` | `/agents` | Custom agent modal |
| 17 | `anywhere-themes.png` | `/anywhere` §2 | Themes picker grid |
| 18 | `anywhere-mobile-qr.png` | `/anywhere` §4 | Phone + QR |
| 19 | `workflow-spec-notes.png` | `/workflow` §1 | Task Notes editor (any Coding Task) |
| 20 | `workflow-chat-cli.png` | `/workflow` §2 | Chat panel + CLI terminal side-by-side |
| 21 | `extend-custom-agent.png` | `/extend` §3 | Custom agent modal |
| 22 | `extend-skills-manage.png` | `/extend` §1 | Manage Skill dialog |
| 23 | `agents-orchestration.gif` | `/agents` §3 | Orchestrator dispatching workers (needs live session) |
| 24 | `anywhere-ide-layout.gif` | `/anywhere` §2 | FlexLayout drag-drop |
| 25 | `studio-sketch.gif` | `/studio` §3 | Drawing on `brand-refresh/hero-layout` |
| 26 | `anywhere-radio.gif` | `/anywhere` §3 | Phone hold-to-talk |
| 27 | `workflow-ship.gif` | `/workflow` §4 | One-step merge of `landing-copy` |

### Tier 4 — SVGs (I draw these, not screenshots)

| # | Filename | Page |
|---|---|---|
| 28 | `agents-worktree-diagram.svg` | `/agents` §2 |
| 29 | `workflow-hero-flow.svg` | `/workflow` hero |
| 30 | `extend-mcp-flow.svg` | `/extend` §2 |

---

## Conventions

- **Format**: PNG for static, GIF ≤ 4 MB / 8–15 fps / loop for motion
- **Theme**: Grove Light (matches paper palette); dark theme only for the rare TUI shot
- **Window chrome**: keep the macOS traffic-light chrome on browser/desktop shots
- **Viewport**: browser at 1440 × 900 or 1600 × 1000, then crop to target
- **DPR**: capture @2x (retina), downscale on export
- **File placement**: `docs/images/<asset-id>.<ext>` — exact filename matches `data-asset` in HTML
- **Redactions**: scrub real auth tokens / emails / internal IPs
