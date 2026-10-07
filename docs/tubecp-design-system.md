# tubecp design system: "Evergreen" v1.1 (shadcn/ui + page motion)

Status: proposal · v1 Oct 5, 2026 IST · **v1.1 Oct 7, 2026 IST** · Owner: Bharath
Files: this doc + `tubecp-tokens.css` (Evergreen palette → shadcn/ui variables → Tailwind v4 `@theme`; compiles on tailwindcss 4.3.3). Scripts: `ds/tokens.py`, `ds/shadcn_map.py`. The v1 snapshot is in `ds/*.v1.*`.

**What changed in v1.1**
- **Components are now shadcn/ui** (§6): exact component names and props, Evergreen wrappers, and no-modal compliance.
- **The tokens map onto shadcn variables** (§3.5). Teal moves to `--primary`, because shadcn's `--accent` is a neutral hover surface. The radius scale now comes from `--radius`. 114 more contrast checks, all passing, plus one shadcn default that fails (`ring-ring/50`).
- **New: page motion in the 21st.dev style** (§7): 16 patterns and a per-page inventory, using framer-motion with reduced-motion support.
- **Migration** (§10): a shadcn adoption plan, the `accent → primary` codemod, component install batches, and an updated rollout.
- Unchanged: the Evergreen palette, Geist fonts, signature pieces, screen patterns (now §8), and accessibility and voice (now §9).
Inputs: repo `BharathLakkoju/tubecp` (read-only), screenshots in `ui-review/tubecp/**`, `design-review.md`, `notes.md`

---

## 0. What exists today (what the new system replaces)

| Area | Current state in repo | Problem |
|---|---|---|
| Framework | Next 16, React 19, **Tailwind v4.3** (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`, no `tailwind.config`) | none, so tokens stay CSS-first |
| Tokens | 10 hex vars: `--bg #eeeeee`, `--surface #f7f7f8`, `--border #e3e3e8`, `--text #0d0d0d`, `--text-muted #6e6e80`, `--accent #10a37f`, `--accent-hover`, `--accent-foreground #fff`, `--success`, `--warning`, plus `--glass-*`, `--motion-*` | No `--danger` (hardcoded `#e53e3e`, `#ef4444`, `#c53030`, `red-500/600`). Success = accent. |
| Fonts | `layout.tsx` loads **DM Sans** twice (`workSans` is actually `DM_Sans`), only `--font-sans` is applied to `<body>`; `@theme` has `--font-mono: var(--font-mono)` (self-reference) | "Mono" UI text is not monospace. Buttons, inputs, and most labels use `font-mono` |
| Shape | Global `border-radius: 0 !important` on buttons, inputs, `.btn-*`, `[class*="cl-"]` | Hard brutalist edges that look dated next to the soft sidebar menu items (which use 0.25rem) |
| Components | Custom classes (`.btn-primary`, `.btn-ghost`, `.split-field`, `.nav-tab`, `.plan-badge`, `.app-sidebar-*`, `.chat-*`, `.kb-delete-*`). **No shadcn/ui, no `components/ui`, no Radix/Base UI**; `lib/cn.ts` is a plain string join | One-off styles; arbitrary sizes. **Decision (Oct 7): adopt shadcn/ui** (§6, §10.2) |
| Icons | `@phosphor-icons/react` (not lucide) | Keep it |
| Motion | `lib/motion.ts` (150/280/400ms, ease `0.22,1,0.36,1`), framer-motion **and** gsap installed, reduced-motion handled for some classes; `FadeIn`, `ScrollReveal`, `Stagger` components | Two animation libs. **Decision: framer-motion only, 21st.dev-style page motion** (§7) |
| Rules | `.cursor/rules/no-modals.mdc`: **no popup modals; use routes**. `KbDeleteConfirmDialog` is an overlay and breaks this rule | The new system follows the rule (see 6.13) |
| Contrast | White on `#10a37f` **3.20:1**, teal links on `#eeeeee` **2.76:1**, muted text on bg **4.30:1**, dark hover white on `#1db88e` **2.53:1**, disabled "research →" (50% opacity) **1.79:1** | All fail AA for 13px text |

---

## 1. Design principles

1. **Evidence before answers.** Every claim, score, and summary points to a source you can check: a video and a timestamp. Citations are styled as their own element, not as body text.
2. **Show the machine working.** Long jobs (research, KB build) always show the current step, counts, elapsed time, and a way out (cancel, retry). A job never sits silently on one number.
3. **One path forward.** Each screen has one obvious next action, and it stays visible (sticky action bar). Secondary options are quieter.
4. **Calm density.** This is a research tool, so dense lists are fine. Get calm from a neutral palette, consistent row height, and a strict type scale, not from removing information.
5. **Accessible by construction.** Tokens are chosen so any documented text/surface pair passes WCAG AA, in both themes. Engineers should not have to check contrast by hand.

---

## 2. Brand direction: "Evergreen"

**In one line:** cool, almost-neutral ink-and-paper surfaces, one deep evergreen-teal accent (the existing teal pushed darker so it passes contrast), soft depth, Geist and Geist Mono, and a timestamp "evidence chip" as the signature element.

### 2.1 Trends we adopt (and why they fit a research/AI tool)

| Trend | How tubecp uses it | Source |
|---|---|---|
| **Restrained neutral base + one accent, generated in a perceptual color space.** Linear rebuilt its themes in LCH from three inputs (base, accent, contrast), cut the "chrome" tint for a more neutral look, and raised text contrast | Neutrals carry a very small teal tint (chroma ≤ 0.012). Teal is the only accent. Status colors appear only for status | [Linear: How we redesigned the Linear UI (part II)](https://linear.app/now/how-we-redesigned-the-linear-ui) |
| **OKLCH color tokens.** Tailwind v4's default palette is defined in OKLCH; OKLCH lightness is perceptual, so contrast stays predictable when you shift hue | All tokens are authored in OKLCH with hex fallbacks, and contrast was computed from the gamut-fitted values | [Tailwind CSS: Colors](https://tailwindcss.com/docs/colors), [Evil Martians: OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl/) |
| **Source-forward AI answers.** NN/g recommends styling citations differently from the answer, placing them next to the claim they support, and linking to the exact passage. They cite Dovetail's timestamped links into recordings as a good example | The evidence chip `▶ 12:34` deep-links to `youtube.com/watch?v=…&t=754s` and shows the excerpt on hover or focus. A "Not covered by these videos" callout uses the existing `gaps` field | [NN/g: Explainable AI in chat interfaces](https://www.nngroup.com/articles/explainable-ai/), [NN/g: Magic-8-ball thinking](https://www.nngroup.com/articles/ai-magic-8-ball/) |
| **Soft depth instead of flat or brutalist.** Small radii, 1px hairlines, and low, wide shadows; in dark mode depth comes from lighter surfaces plus a 1px top highlight | Replaces `radius: 0 !important` with a 4/6/10/14px radius scale and 3 elevation levels | Design judgment (no stat claimed) |
| **Bento dashboards** for overview pages | KB list and KB detail header use a tile grid: videos, minutes, chunks, and last-updated stats | Design judgment |
| **Variable fonts, dark mode as a first-class theme** | Geist and Geist Mono (variable, OFL). Both themes are tuned and tested; neither is an inversion of the other | Design judgment |

| **Choreographed marketing motion** (section reveals, staggered children, hero text reveals, card lift), the style catalogued on 21st.dev | Spec'd as 16 token-based patterns with reduced-motion fallbacks (§7). In the app, motion stays fast and functional | [21st](https://21st.dev) component categories (Hero, Text Animation, Cards, Pricing Sections) |

**Not adopted:** glassmorphism everywhere (we keep blur only on sticky headers and the action bar), gradients or "AI glow" (they compete with thumbnails), and illustrated mascots.

### 2.2 Signature ideas
1. **Evidence chip:** a mono timestamp inside soft brackets, `[▶ 12:34]`, echoing the `[tubecp]` wordmark. Used in chat, search previews, and the MCP docs.
2. **Relevance meter:** a mono score (`92`) plus a 5-segment bar. Lists are always sorted by it.
3. **Pipeline rail:** one stepper component for both research (Expand → Search → Analyze → Rank) and KB build (Queued → Transcripts → Chunk → Embed → Index → Ready). It shows per-step counts and a stalled state.
4. **Action dock:** a sticky bar holding the screen's primary next actions.
5. **Bracket focus:** the selected row gets a 2px accent bar on its left edge (already used in `.app-sidebar-kb-link-active`), extended system-wide.

---

## 3. Color

### 3.1 Rules
- Author colors in OKLCH; ship hex first and upgrade with `@supports (color: oklch(0 0 0))` (see `tubecp-tokens.css`). Values were gamut-fitted to sRGB, so the hex and OKLCH render the same color.
- **Neutral hue 183** (cool, slightly teal grey). Accent hue 176-178.
- **Use semantic tokens only in components.** Since v1.1 these are the shadcn names (`bg-background`, `bg-card`, `text-muted-foreground`, `bg-primary`; map in §3.5). Never write raw hex or Tailwind palette colors (`red-500`) in components.
- **`--border` is decorative** (cards, dividers, ~1.3:1). **Anything that must be seen to be used** (input outlines, checkbox edges, toggle tracks) uses `--border-strong` (≥3:1, WCAG 1.4.11).
- Status color never stands alone: always pair it with an icon and a word.
- Accent ≠ success. Accent (teal, 178) means "act/selected"; success (green, 150) means "done". Done states also always show a check icon.

### 3.2 Token set

These are the Evergreen source names. Since v1.1 the tokens file stores them as `--ev-<name>`, and components use the shadcn names in §3.5.

| Token | Light OKLCH | Light hex | Dark OKLCH | Dark hex |
|---|---|---|---|---|
| `--bg` | `oklch(98.5% 0.003 183)` | `#f8fbfa` | `oklch(16.5% 0.006 183)` | `#0c0f0f` |
| `--surface` | `oklch(100.0% 0.000 183)` | `#ffffff` | `oklch(20.5% 0.007 183)` | `#141817` |
| `--surface-2` | `oklch(96.5% 0.004 183)` | `#f1f4f4` | `oklch(24.0% 0.008 183)` | `#1b2120` |
| `--surface-3` | `oklch(94.0% 0.006 183)` | `#e7eceb` | `oklch(28.0% 0.009 183)` | `#242a29` |
| `--border` | `oklch(90.5% 0.006 183)` | `#dce1e0` | `oklch(31.0% 0.009 183)` | `#2c3231` |
| `--border-strong` | `oklch(62.0% 0.010 183)` | `#808887` | `oklch(56.0% 0.012 183)` | `#6d7775` |
| `--text` | `oklch(21.0% 0.012 183)` | `#121a19` | `oklch(96.5% 0.004 183)` | `#f1f4f4` |
| `--text-secondary` | `oklch(40.0% 0.012 183)` | `#414a48` | `oklch(82.0% 0.008 183)` | `#bfc6c4` |
| `--text-muted` | `oklch(50.0% 0.012 183)` | `#5c6664` | `oklch(72.0% 0.010 183)` | `#9ea7a5` |
| `--accent` | `oklch(48.0% 0.088 178)` | `#016d5e` | `oklch(80.0% 0.120 176)` | `#58d7bb` |
| `--accent-hover` | `oklch(42.0% 0.077 178)` | `#015a4d` | `oklch(86.0% 0.110 176)` | `#7ae9ce` |
| `--accent-fg` | `oklch(99.0% 0.004 178)` | `#f9fdfc` | `oklch(18.0% 0.030 180)` | `#011612` |
| `--accent-text` | `oklch(47.0% 0.086 178)` | `#026a5b` | `oklch(80.0% 0.120 176)` | `#58d7bb` |
| `--accent-subtle` | `oklch(95.5% 0.025 178)` | `#dff6f0` | `oklch(29.0% 0.045 178)` | `#0c332b` |
| `--accent-subtle-fg` | `oklch(38.0% 0.070 178)` | `#004e42` | `oklch(88.0% 0.090 176)` | `#95ebd5` |
| `--success` | `oklch(48.0% 0.120 150)` | `#197037` | `oklch(80.0% 0.150 150)` | `#6ed889` |
| `--success-subtle` | `oklch(96.0% 0.030 150)` | `#e4f8e7` | `oklch(27.0% 0.050 150)` | `#122d19` |
| `--warning` | `oklch(50.0% 0.110 60)` | `#905211` | `oklch(84.0% 0.130 80)` | `#f7c15f` |
| `--warning-subtle` | `oklch(96.5% 0.031 80)` | `#fff2dd` | `oklch(28.0% 0.050 70)` | `#382409` |
| `--danger` | `oklch(52.0% 0.190 27)` | `#be2323` | `oklch(74.0% 0.150 25)` | `#fb817a` |
| `--danger-subtle` | `oklch(96.5% 0.017 27)` | `#ffefed` | `oklch(28.0% 0.060 25)` | `#421c19` |
| `--danger-fg` | `oklch(99.0% 0.000 0)` | `#fcfcfc` | `oklch(18.0% 0.030 25)` | `#1d0c0b` |
| `--info` | `oklch(50.0% 0.150 258)` | `#2460b7` | `oklch(78.0% 0.110 255)` | `#87bafd` |
| `--info-subtle` | `oklch(96.5% 0.016 258)` | `#edf4ff` | `oklch(28.0% 0.050 258)` | `#192941` |
| `--focus` | `oklch(55.0% 0.101 178)` | `#018472` | `oklch(80.0% 0.120 176)` | `#58d7bb` |

Derived (not separate tokens): hover row = `color-mix(in oklch, var(--text) 5%, transparent)`, pressed = 8%, scrim (mobile nav only) = `oklch(0 0 0 / 0.5)`, glass bar = `color-mix(in oklch, var(--surface) 82%, transparent)` + `backdrop-filter: blur(16px) saturate(160%)`.

**Elevation (in tokens file):** `--elev-1` (cards on bg), `--elev-2` (menus, action bar, toasts), `--elev-3` (mobile sidebar sheet). Dark mode uses deeper shadows and also raises the surface (`surface` → `surface-2` → `surface-3`) and adds `--ring-inset`.

### 3.3 The teal button fix (explicit)

(Evergreen `--accent` is shadcn `--primary` as of v1.1; the values are unchanged.)

| | Old | New light | New dark |
|---|---|---|---|
| Primary fill | `#10a37f` + white text = **3.20:1** (fails) | `--accent #016d5e` + `--accent-fg #f9fdfc` = **6.11:1** | `--accent #58d7bb` + `--accent-fg #011612` = **10.54:1** (dark text on a light teal fill; never white) |
| Hover | white on `#0d8f6f` (light) / `#1db88e` (dark) = **2.53:1** dark | `#015a4d` = **7.97:1** | `#7ae9ce` = **12.78:1** |
| Link / accent text | `#10a37f` on `#eeeeee` = **2.76:1** | `--accent-text #026a5b` on bg = **6.27:1** | `#58d7bb` on bg = **10.87:1** |
| Empty-query "research →" | Disabled at 50% opacity = **1.79:1** | **Never disabled for an empty query.** Keep it enabled; on submit, focus the field and show "Enter a topic to research." Real disabled state (e.g. quota used up) = `surface-3` fill + `text-muted` text (**4.97:1**) + a reason line | same pattern |

### 3.4 Contrast results (computed)

Method: OKLCH → linear sRGB (Ottosson matrices) → gamut-fit by reducing chroma → 8-bit sRGB → WCAG 2.x relative luminance. Thresholds: body text 4.5:1; large text, UI parts, and focus rings 3:1. Script: `ui-review/ds/tokens.py` (`python3 tokens.py`).
**Result: 82 / 82 pairs pass.** Lowest body pair: light `text-muted` on `surface-3` at 4.97:1. Lowest UI pair: light `border-strong` on `bg` at 3.48:1.

| Theme | Foreground | Background | Ratio | Needs | Pass |
|---|---|---|---|---|---|
| light | `text` #121a19 | `bg` #f8fbfa | 16.99:1 | 4.5:1 | yes |
| light | `text` #121a19 | `surface` #ffffff | 17.68:1 | 4.5:1 | yes |
| light | `text` #121a19 | `surface-2` #f1f4f4 | 15.99:1 | 4.5:1 | yes |
| light | `text` #121a19 | `surface-3` #e7eceb | 14.82:1 | 4.5:1 | yes |
| light | `text-secondary` #414a48 | `bg` #f8fbfa | 8.78:1 | 4.5:1 | yes |
| light | `text-secondary` #414a48 | `surface` #ffffff | 9.14:1 | 4.5:1 | yes |
| light | `text-secondary` #414a48 | `surface-2` #f1f4f4 | 8.26:1 | 4.5:1 | yes |
| light | `text-muted` #5c6664 | `bg` #f8fbfa | 5.70:1 | 4.5:1 | yes |
| light | `text-muted` #5c6664 | `surface` #ffffff | 5.93:1 | 4.5:1 | yes |
| light | `text-muted` #5c6664 | `surface-2` #f1f4f4 | 5.36:1 | 4.5:1 | yes |
| light | `text-muted` #5c6664 | `surface-3` #e7eceb | 4.97:1 | 4.5:1 | yes |
| light | `accent-fg` #f9fdfc | `accent` #016d5e | 6.11:1 | 4.5:1 | yes |
| light | `accent-fg` #f9fdfc | `accent-hover` #015a4d | 7.97:1 | 4.5:1 | yes |
| light | `accent-text` #026a5b | `bg` #f8fbfa | 6.27:1 | 4.5:1 | yes |
| light | `accent-text` #026a5b | `surface` #ffffff | 6.53:1 | 4.5:1 | yes |
| light | `accent-text` #026a5b | `surface-2` #f1f4f4 | 5.91:1 | 4.5:1 | yes |
| light | `accent-subtle-fg` #004e42 | `accent-subtle` #dff6f0 | 8.57:1 | 4.5:1 | yes |
| light | `success` #197037 | `bg` #f8fbfa | 5.91:1 | 4.5:1 | yes |
| light | `success` #197037 | `surface` #ffffff | 6.15:1 | 4.5:1 | yes |
| light | `success` #197037 | `success-subtle` #e4f8e7 | 5.53:1 | 4.5:1 | yes |
| light | `warning` #905211 | `bg` #f8fbfa | 5.93:1 | 4.5:1 | yes |
| light | `warning` #905211 | `surface` #ffffff | 6.17:1 | 4.5:1 | yes |
| light | `warning` #905211 | `warning-subtle` #fff2dd | 5.59:1 | 4.5:1 | yes |
| light | `danger` #be2323 | `bg` #f8fbfa | 5.84:1 | 4.5:1 | yes |
| light | `danger` #be2323 | `surface` #ffffff | 6.08:1 | 4.5:1 | yes |
| light | `danger` #be2323 | `danger-subtle` #ffefed | 5.45:1 | 4.5:1 | yes |
| light | `danger-fg` #fcfcfc | `danger` #be2323 | 5.93:1 | 4.5:1 | yes |
| light | `info` #2460b7 | `bg` #f8fbfa | 5.88:1 | 4.5:1 | yes |
| light | `info` #2460b7 | `surface` #ffffff | 6.12:1 | 4.5:1 | yes |
| light | `info` #2460b7 | `info-subtle` #edf4ff | 5.53:1 | 4.5:1 | yes |
| light | `text` #121a19 | `accent-subtle` #dff6f0 | 15.64:1 | 4.5:1 | yes |
| light | `text-muted` #5c6664 | `accent-subtle` #dff6f0 | 5.25:1 | 4.5:1 | yes |
| light | `text` #121a19 | `danger-subtle` #ffefed | 15.85:1 | 4.5:1 | yes |
| light | `text` #121a19 | `warning-subtle` #fff2dd | 16.00:1 | 4.5:1 | yes |
| light | `accent` #016d5e | `bg` #f8fbfa | 6.02:1 | 3.0:1 | yes |
| light | `accent` #016d5e | `surface` #ffffff | 6.27:1 | 3.0:1 | yes |
| light | `focus` #018472 | `bg` #f8fbfa | 4.44:1 | 3.0:1 | yes |
| light | `focus` #018472 | `surface` #ffffff | 4.62:1 | 3.0:1 | yes |
| light | `focus` #018472 | `surface-2` #f1f4f4 | 4.18:1 | 3.0:1 | yes |
| light | `border-strong` #808887 | `bg` #f8fbfa | 3.48:1 | 3.0:1 | yes |
| light | `border-strong` #808887 | `surface` #ffffff | 3.63:1 | 3.0:1 | yes |
| dark | `text` #f1f4f4 | `bg` #0c0f0f | 17.41:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `surface` #141817 | 16.19:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `surface-2` #1b2120 | 14.78:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `surface-3` #242a29 | 13.20:1 | 4.5:1 | yes |
| dark | `text-secondary` #bfc6c4 | `bg` #0c0f0f | 11.08:1 | 4.5:1 | yes |
| dark | `text-secondary` #bfc6c4 | `surface` #141817 | 10.31:1 | 4.5:1 | yes |
| dark | `text-secondary` #bfc6c4 | `surface-2` #1b2120 | 9.41:1 | 4.5:1 | yes |
| dark | `text-muted` #9ea7a5 | `bg` #0c0f0f | 7.81:1 | 4.5:1 | yes |
| dark | `text-muted` #9ea7a5 | `surface` #141817 | 7.27:1 | 4.5:1 | yes |
| dark | `text-muted` #9ea7a5 | `surface-2` #1b2120 | 6.63:1 | 4.5:1 | yes |
| dark | `text-muted` #9ea7a5 | `surface-3` #242a29 | 5.93:1 | 4.5:1 | yes |
| dark | `accent-fg` #011612 | `accent` #58d7bb | 10.54:1 | 4.5:1 | yes |
| dark | `accent-fg` #011612 | `accent-hover` #7ae9ce | 12.78:1 | 4.5:1 | yes |
| dark | `accent-text` #58d7bb | `bg` #0c0f0f | 10.87:1 | 4.5:1 | yes |
| dark | `accent-text` #58d7bb | `surface` #141817 | 10.11:1 | 4.5:1 | yes |
| dark | `accent-text` #58d7bb | `surface-2` #1b2120 | 9.22:1 | 4.5:1 | yes |
| dark | `accent-subtle-fg` #95ebd5 | `accent-subtle` #0c332b | 9.92:1 | 4.5:1 | yes |
| dark | `success` #6ed889 | `bg` #0c0f0f | 10.86:1 | 4.5:1 | yes |
| dark | `success` #6ed889 | `surface` #141817 | 10.10:1 | 4.5:1 | yes |
| dark | `success` #6ed889 | `success-subtle` #122d19 | 8.37:1 | 4.5:1 | yes |
| dark | `warning` #f7c15f | `bg` #0c0f0f | 11.69:1 | 4.5:1 | yes |
| dark | `warning` #f7c15f | `surface` #141817 | 10.87:1 | 4.5:1 | yes |
| dark | `warning` #f7c15f | `warning-subtle` #382409 | 8.95:1 | 4.5:1 | yes |
| dark | `danger` #fb817a | `bg` #0c0f0f | 7.81:1 | 4.5:1 | yes |
| dark | `danger` #fb817a | `surface` #141817 | 7.27:1 | 4.5:1 | yes |
| dark | `danger` #fb817a | `danger-subtle` #421c19 | 6.04:1 | 4.5:1 | yes |
| dark | `danger-fg` #1d0c0b | `danger` #fb817a | 7.68:1 | 4.5:1 | yes |
| dark | `info` #87bafd | `bg` #0c0f0f | 9.60:1 | 4.5:1 | yes |
| dark | `info` #87bafd | `surface` #141817 | 8.93:1 | 4.5:1 | yes |
| dark | `info` #87bafd | `info-subtle` #192941 | 7.30:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `accent-subtle` #0c332b | 12.46:1 | 4.5:1 | yes |
| dark | `text-muted` #9ea7a5 | `accent-subtle` #0c332b | 5.59:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `danger-subtle` #421c19 | 13.45:1 | 4.5:1 | yes |
| dark | `text` #f1f4f4 | `warning-subtle` #382409 | 13.33:1 | 4.5:1 | yes |
| dark | `accent` #58d7bb | `bg` #0c0f0f | 10.87:1 | 3.0:1 | yes |
| dark | `accent` #58d7bb | `surface` #141817 | 10.11:1 | 3.0:1 | yes |
| dark | `focus` #58d7bb | `bg` #0c0f0f | 10.87:1 | 3.0:1 | yes |
| dark | `focus` #58d7bb | `surface` #141817 | 10.11:1 | 3.0:1 | yes |
| dark | `focus` #58d7bb | `surface-2` #1b2120 | 9.22:1 | 3.0:1 | yes |
| dark | `border-strong` #6d7775 | `bg` #0c0f0f | 4.17:1 | 3.0:1 | yes |
| dark | `border-strong` #6d7775 | `surface` #141817 | 3.88:1 | 3.0:1 | yes |

**Not allowed (not in the table, so not guaranteed):** status text on `surface-3`, `text-muted` on `accent` fill, any text on thumbnails without a scrim, `border` as the only boundary of an input.

### 3.5 shadcn/ui variable map

**Use this:** components only ever reference shadcn variables (`bg-background`, `text-primary`, `border-input`, `ring-ring`) or the Evergreen extensions listed below. The `--ev-*` palette is the single source of truth; the shadcn variables point at it (see `tubecp-tokens.css` §1-2).

Three name collisions to know:
1. **shadcn `--accent` is a neutral hover/selected surface,** not a brand color. Evergreen teal is **`--primary`**, and shadcn `--accent` is Evergreen `surface-3`. Every old `accent` class must be renamed to `primary` (§10.2 step 3).
2. **`--input` is the control border:** Evergreen `border-strong`, at ≥3:1. That fixes the old "inputs use the decorative border" issue for free.
3. **`--ring` is Evergreen `focus`.** shadcn's scaffold uses `outline-ring/50`, and generated components often use `ring-ring/50`. **At 50% opacity, the light-mode ring is 2.0:1 against `background`, which fails WCAG 1.4.11** (dark is 3.46:1). Override to full-strength `ring-ring` (light 4.44:1, dark 10.87:1).

| shadcn variable | Evergreen token | Light | Dark |
|---|---|---|---|
| `--background` | `bg` | `#f8fbfa` | `#0c0f0f` |
| `--foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--card` | `surface` | `#ffffff` | `#141817` |
| `--card-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--popover` | `surface` | `#ffffff` | `#141817` |
| `--popover-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--primary` | `accent` | `#016d5e` | `#58d7bb` |
| `--primary-foreground` | `accent-fg` | `#f9fdfc` | `#011612` |
| `--secondary` | `surface-2` | `#f1f4f4` | `#1b2120` |
| `--secondary-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--muted` | `surface-2` | `#f1f4f4` | `#1b2120` |
| `--muted-foreground` | `text-muted` | `#5c6664` | `#9ea7a5` |
| `--accent` | `surface-3` | `#e7eceb` | `#242a29` |
| `--accent-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--destructive` | `danger` | `#be2323` | `#fb817a` |
| `--border` | `border` | `#dce1e0` | `#2c3231` |
| `--input` | `border-strong` | `#808887` | `#6d7775` |
| `--ring` | `focus` | `#018472` | `#58d7bb` |
| `--chart-1` | `accent` | `#016d5e` | `#58d7bb` |
| `--chart-2` | `info` | `#2460b7` | `#87bafd` |
| `--chart-3` | `warning` | `#905211` | `#f7c15f` |
| `--chart-4` | `success` | `#197037` | `#6ed889` |
| `--chart-5` | `text-muted` | `#5c6664` | `#9ea7a5` |
| `--sidebar` | `surface` | `#ffffff` | `#141817` |
| `--sidebar-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--sidebar-primary` | `accent` | `#016d5e` | `#58d7bb` |
| `--sidebar-primary-foreground` | `accent-fg` | `#f9fdfc` | `#011612` |
| `--sidebar-accent` | `surface-3` | `#e7eceb` | `#242a29` |
| `--sidebar-accent-foreground` | `text` | `#121a19` | `#f1f4f4` |
| `--sidebar-border` | `border` | `#dce1e0` | `#2c3231` |
| `--sidebar-ring` | `focus` | `#018472` | `#58d7bb` |
| *Evergreen extensions (added with `@theme inline`, per shadcn "Adding New Tokens")* | | | |
| `--foreground-secondary` | `text-secondary` | `#414a48` | `#bfc6c4` |
| `--primary-hover` | `accent-hover` | `#015a4d` | `#7ae9ce` |
| `--primary-subtle` | `accent-subtle` | `#dff6f0` | `#0c332b` |
| `--primary-subtle-foreground` | `accent-subtle-fg` | `#004e42` | `#95ebd5` |
| `--destructive-foreground` | `danger-fg` | `#fcfcfc` | `#1d0c0b` |
| `--destructive-subtle` | `danger-subtle` | `#ffefed` | `#421c19` |
| `--success` | `success` | `#197037` | `#6ed889` |
| `--success-subtle` | `success-subtle` | `#e4f8e7` | `#122d19` |
| `--warning` | `warning` | `#905211` | `#f7c15f` |
| `--warning-subtle` | `warning-subtle` | `#fff2dd` | `#382409` |
| `--info` | `info` | `#2460b7` | `#87bafd` |
| `--info-subtle` | `info-subtle` | `#edf4ff` | `#192941` |

Radius: `--radius: 0.625rem` (10px) with shadcn's derived scale:

| Evergreen v1 | shadcn utility | px | Use |
|---|---|---|---|
| xs 4 | `rounded-xs` (Evergreen extension) | 4 | dense badges, chips, kbd |
| sm 6 | `rounded-sm` | 6 | small buttons, inputs inside groups |
| (new) | `rounded-md` | 8 | buttons, inputs (shadcn default) |
| md 10 | `rounded-lg` | 10 | menus, popovers, list containers, search bar |
| lg 14 | `rounded-xl` | 14 | `Card`, bento tiles, pricing, action dock |
| (new) | `rounded-2xl` | 18 | marketing hero frame only |

Fonts: the shadcn `--font-sans` / `--font-mono` theme keys point at next/font's `--font-geist-sans` / `--font-geist-mono`.
Dark mode: shadcn's `dark:` variant is re-pointed at `[data-color-scheme="dark"]` with `@custom-variant`, so the existing ThemeProvider keeps working. Moving to `next-themes` later (`attribute="data-color-scheme"`) is optional.

**Contrast for shadcn-named pairs (computed, `ds/shadcn_map.py`): 57 pairs × 2 themes = 114 checks, 0 failures.**
- Lowest text pair: light `muted-foreground` on `accent` at 4.97:1.
- Lowest non-text pair: light `input` on `background` at 3.48:1.

| Foreground | Background | Min | Light | Dark |
|---|---|---|---|---|
| `foreground` | `background` | 4.5:1 text | 16.99 ✓ | 17.41 ✓ |
| `muted-foreground` | `background` | 4.5:1 text | 5.70 ✓ | 7.81 ✓ |
| `foreground-secondary` | `background` | 4.5:1 text | 8.78 ✓ | 11.08 ✓ |
| `foreground` | `card` | 4.5:1 text | 17.68 ✓ | 16.19 ✓ |
| `muted-foreground` | `card` | 4.5:1 text | 5.93 ✓ | 7.27 ✓ |
| `foreground-secondary` | `card` | 4.5:1 text | 9.14 ✓ | 10.31 ✓ |
| `foreground` | `popover` | 4.5:1 text | 17.68 ✓ | 16.19 ✓ |
| `muted-foreground` | `popover` | 4.5:1 text | 5.93 ✓ | 7.27 ✓ |
| `foreground-secondary` | `popover` | 4.5:1 text | 9.14 ✓ | 10.31 ✓ |
| `foreground` | `secondary` | 4.5:1 text | 15.99 ✓ | 14.78 ✓ |
| `muted-foreground` | `secondary` | 4.5:1 text | 5.36 ✓ | 6.63 ✓ |
| `foreground-secondary` | `secondary` | 4.5:1 text | 8.26 ✓ | 9.41 ✓ |
| `foreground` | `muted` | 4.5:1 text | 15.99 ✓ | 14.78 ✓ |
| `muted-foreground` | `muted` | 4.5:1 text | 5.36 ✓ | 6.63 ✓ |
| `foreground-secondary` | `muted` | 4.5:1 text | 8.26 ✓ | 9.41 ✓ |
| `foreground` | `accent` | 4.5:1 text | 14.82 ✓ | 13.20 ✓ |
| `muted-foreground` | `accent` | 4.5:1 text | 4.97 ✓ | 5.93 ✓ |
| `foreground-secondary` | `accent` | 4.5:1 text | 7.66 ✓ | 8.41 ✓ |
| `foreground` | `sidebar` | 4.5:1 text | 17.68 ✓ | 16.19 ✓ |
| `muted-foreground` | `sidebar` | 4.5:1 text | 5.93 ✓ | 7.27 ✓ |
| `foreground-secondary` | `sidebar` | 4.5:1 text | 9.14 ✓ | 10.31 ✓ |
| `foreground` | `sidebar-accent` | 4.5:1 text | 14.82 ✓ | 13.20 ✓ |
| `muted-foreground` | `sidebar-accent` | 4.5:1 text | 4.97 ✓ | 5.93 ✓ |
| `foreground-secondary` | `sidebar-accent` | 4.5:1 text | 7.66 ✓ | 8.41 ✓ |
| `primary-foreground` | `primary` | 4.5:1 text | 6.11 ✓ | 10.54 ✓ |
| `primary-foreground` | `primary-hover` | 4.5:1 text | 7.97 ✓ | 12.78 ✓ |
| `sidebar-primary-foreground` | `sidebar-primary` | 4.5:1 text | 6.11 ✓ | 10.54 ✓ |
| `primary` | `background` | 4.5:1 text | 6.02 ✓ | 10.87 ✓ |
| `primary` | `card` | 4.5:1 text | 6.27 ✓ | 10.11 ✓ |
| `primary` | `muted` | 4.5:1 text | 5.67 ✓ | 9.22 ✓ |
| `primary` | `accent` | 4.5:1 text | 5.25 ✓ | 8.24 ✓ |
| `primary-subtle-foreground` | `primary-subtle` | 4.5:1 text | 8.57 ✓ | 9.92 ✓ |
| `foreground` | `primary-subtle` | 4.5:1 text | 15.64 ✓ | 12.46 ✓ |
| `muted-foreground` | `primary-subtle` | 4.5:1 text | 5.25 ✓ | 5.59 ✓ |
| `destructive` | `background` | 4.5:1 text | 5.84 ✓ | 7.81 ✓ |
| `destructive` | `card` | 4.5:1 text | 6.08 ✓ | 7.27 ✓ |
| `destructive` | `destructive-subtle` | 4.5:1 text | 5.45 ✓ | 6.04 ✓ |
| `destructive-foreground` | `destructive` | 4.5:1 text | 5.93 ✓ | 7.68 ✓ |
| `success` | `card` | 4.5:1 text | 6.15 ✓ | 10.10 ✓ |
| `success` | `success-subtle` | 4.5:1 text | 5.53 ✓ | 8.37 ✓ |
| `warning` | `card` | 4.5:1 text | 6.17 ✓ | 10.87 ✓ |
| `warning` | `warning-subtle` | 4.5:1 text | 5.59 ✓ | 8.95 ✓ |
| `info` | `card` | 4.5:1 text | 6.12 ✓ | 8.93 ✓ |
| `info` | `info-subtle` | 4.5:1 text | 5.53 ✓ | 7.30 ✓ |
| `ring` | `background` | 3.0:1 non-text | 4.44 ✓ | 10.87 ✓ |
| `ring` | `card` | 3.0:1 non-text | 4.62 ✓ | 10.11 ✓ |
| `ring` | `muted` | 3.0:1 non-text | 4.18 ✓ | 9.22 ✓ |
| `ring` | `accent` | 3.0:1 non-text | 3.87 ✓ | 8.24 ✓ |
| `ring` | `primary-subtle` | 3.0:1 non-text | 4.09 ✓ | 7.78 ✓ |
| `input` | `background` | 3.0:1 non-text | 3.48 ✓ | 4.17 ✓ |
| `input` | `card` | 3.0:1 non-text | 3.63 ✓ | 3.88 ✓ |
| `primary` | `card` | 3.0:1 non-text | 6.27 ✓ | 10.11 ✓ |
| `chart-1` | `card` | 3.0:1 non-text | 6.27 ✓ | 10.11 ✓ |
| `chart-2` | `card` | 3.0:1 non-text | 6.12 ✓ | 8.93 ✓ |
| `chart-3` | `card` | 3.0:1 non-text | 6.17 ✓ | 10.87 ✓ |
| `chart-4` | `card` | 3.0:1 non-text | 6.15 ✓ | 10.10 ✓ |
| `chart-5` | `card` | 3.0:1 non-text | 5.93 ✓ | 7.27 ✓ |


---

## 4. Typography

### 4.1 Fonts
- **UI: Geist** (variable 100-900, OFL, on Google Fonts). It is neutral, compact, and has good figure shapes for dense lists.
- **Data: Geist Mono** (variable). Use it only for timestamps, scores, counts, quotas, IDs, code, MCP endpoints, and the wordmark.
- Fallbacks if Geist is unwanted: Inter + JetBrains Mono, or Instrument Sans + IBM Plex Mono.

```tsx
// app/layout.tsx (replaces the DM_Sans x2 setup)
import { Geist, Geist_Mono } from "next/font/google";
const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// <html className={`${sans.variable} ${mono.variable}`} ...>
```
In `globals.css`, the base layer must stop applying `font-mono` to `button, input, textarea, select`. Controls use sans.

### 4.2 Scale (Tailwind classes generated from `@theme`)

| Token / class | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `text-display` | 44 / 48 | 600 | -0.03em | Landing hero only |
| `text-headline` | 28 / 36 | 600 | -0.02em | Page title (Pricing, 404 number) |
| `text-title` | 20 / 28 | 600 | -0.01em | Screen title ("Research: how to make sourdough bread") |
| `text-title-sm` | 17 / 24 | 600 | 0 | Card and section titles |
| `text-body` | 15 / 24 | 400 | 0 | Default body, chat answers |
| `text-body-sm` | 14 / 22 | 400/500 | 0 | List rows, inputs, buttons |
| `text-label` | 13 / 18 | 500 | 0 | Field labels, tabs, badges, meta lines |
| `text-caption` | 12 / 16 | 400/500 | 0 (+0.04em when uppercase) | Helper text, timestamps, legal. **Minimum size.** |

Rules: nothing smaller than 12px (this kills `text-[10px]` and `text-[11px]`). Use `text-secondary` for supporting copy; `text-muted` is only for captions and placeholders. Mono numbers use `tabular-nums`. Uppercase only for ≤3-word overlines. Chat answers: max width 68ch.

---

## 5. Foundations

**Spacing:** 4px base. Use the Tailwind default scale: 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64). Row padding is 12px; card padding is 16px dense / 24px default; section gap is 32px.

**Grid & layout**
- App shell: sidebar 264px (existing `.app-sidebar` 16.5rem) + main. Content max is 960px for lists and 720px for reading and chat (the current 780px is too narrow for a ranked list with metadata).
- Marketing: 12-column, 1120px max, 24px gutters.
- Breakpoints: Tailwind defaults. Below `md`, the sidebar becomes a sheet (existing behavior).

**Radii (v1.1, shadcn-derived from `--radius: 0.625rem`):** `rounded-xs` 4 (dense badges, chips, kbd), `rounded-sm` 6 (small controls), `rounded-md` 8 (buttons, inputs), `rounded-lg` 10 (menus, popovers, list containers, search bar), `rounded-xl` 14 (cards, bento tiles, pricing, action dock), `rounded-full` (pills, avatars, dots). Thumbnails use 6. Delete the global `border-radius: 0 !important` block. Mapping from v1 is in §3.5.

**Borders:** 1px hairlines everywhere; 2px is reserved for focus and the selected-row bar.

**Elevation:** 0 = flat (rows inside a card); 1 = card on bg; 2 = floating (menus, dock, toasts); 3 = sheets. Do not combine a border and shadow-2+ on the same element in light mode; use one or the other.

**Iconography:** keep **Phosphor** (`@phosphor-icons/react`) for product icons. Generated shadcn components import `lucide-react` internally; leave those as they are (§6). Weight `regular`; `fill` only for the active nav item and status icons. Sizes: 16 inline, 20 for buttons and nav, 24 for empty states (inside a 48px tinted circle). Icon-only buttons need an `aria-label` and a 36px minimum hit area (44 on touch). Core set: MagnifyingGlass, Books (KB), ChatsCircle, Play (timestamps), ArrowClockwise (retry), X (cancel), CheckCircle, WarningCircle, XCircle, Clock (queued), Pause (stalled).

**Motion**

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | 80ms | press, toggle |
| `--duration-fast` | 140ms | hover, color |
| `--duration-base` | 220ms | menus, collapse, toast in |
| `--duration-slow` | 360ms | sheet, page-level fade |
| `ease-out` | `cubic-bezier(.22,1,.36,1)` | default (same as `lib/motion.ts`) |
| `ease-in-out` | `cubic-bezier(.65,0,.35,1)` | position changes |
| `--ease-spring` | `cubic-bezier(.34,1.4,.64,1)` | toast and badge pop only |

- List items fade up 6px with a 30ms stagger, capped at 8 items (do not stagger 45 rows).
- Progress bars animate width with `ease-out` over 360ms. Indeterminate states use a shimmer, never a spinning progress bar.
- `prefers-reduced-motion`: durations drop to 0 (handled in the tokens file). Keep opacity changes and remove transforms and shimmer; skeletons become static `surface-2`.
- Libraries: framer-motion plus CSS; remove gsap.
- **Page and section choreography** (reveal 520ms, hero 720ms, staggers 60/30ms) and the per-page inventory are in **§7**.

---

## 6. Components (shadcn/ui)

**Use this:** build every component from shadcn/ui primitives in `components/ui/` (generated by the CLI and kept close to upstream). Evergreen-specific compositions live in `components/tubecp/`, and motion primitives in `components/motion/`. Style through tokens (§3.5) and `className`. Fork a generated file only for the documented overrides in §10.2 step 4.

- Names and props below were checked against ui.shadcn.com on Oct 7, 2026 IST.
- Current docs default to the **Base UI** base: polymorphism uses the `render` prop (`render={<Link href="…" />}`), not `asChild`. If you choose Radix at init, use `asChild` where this doc says `render`.
- No `Dialog`, `AlertDialog` or `Drawer` (repo rule, §6.13).

| # | tubecp component | shadcn components | Evergreen wrapper (`components/tubecp/`) |
|---|---|---|---|
| 6.1 | Button | `Button`, `buttonVariants`, `Spinner`, `ButtonGroup` | none (use directly) |
| 6.2 | Search bar | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `InputGroup`, `InputGroupInput`, `InputGroupAddon`, `InputGroupButton`, `Kbd` | `SearchBar` |
| 6.3 | Video result row/card | `Item`, `ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`, `Checkbox`, `Badge`, `Tooltip`; `Card` for grid | `VideoResultRow`, `VideoResultCard`, `RelevanceMeter` |
| 6.4 | Lists & tables | `ItemGroup`, `ItemSeparator`, `Table`, `Collapsible`, `ScrollArea` | `RankedVideoList` |
| 6.5 | Tabs / segmented | `Tabs`, `TabsList` (`variant="line"`), `TabsTrigger`, `TabsContent`, `ToggleGroup`, `ToggleGroupItem`, `NavigationMenu` | none |
| 6.6 | Badges / plan badge | `Badge` (+ `Spinner`) | `StatusBadge`, `PlanBadge` |
| 6.7 | Progress & job status | `Progress`, `ProgressLabel`, `ProgressValue`, `Alert`, `AlertTitle`, `AlertDescription`, `AlertAction`, `Marker` (`role="status"`), `Spinner`, `Card` | `JobStatus`, `PipelineRail` |
| 6.8 | Toasts | `Toast` (`Toaster`, `toast.add`, `toast.promise`) | none |
| 6.9 | Empty states | `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent` | none |
| 6.10 | Skeletons | `Skeleton`, `SidebarMenuSkeleton` | `VideoResultSkeleton` |
| 6.11 | Sticky action bar | `Card` (`size="sm"`), `ButtonGroup`, `Button`, `Badge`, `Tooltip` | `ActionDock` |
| 6.12 | Chat + citations | `MessageScroller`, `MessageGroup`, `Message`, `MessageContent`, `MessageHeader`, `MessageFooter`, `Bubble`, `BubbleContent`, `Marker`, `HoverCard`, `Collapsible`, `Item`, `Alert`, `InputGroupTextarea` | `EvidenceChip`, `SourceList`, `ChatComposer` |
| 6.13 | Confirms (no modals) | `Popover`, `DropdownMenu`, `HoverCard`, `Tooltip`, `Collapsible`, `ButtonGroup`, `Alert`; `Sheet` only via `Sidebar` on mobile | `InlineConfirm` |
| 6.14 | Nav / sidebar | `SidebarProvider`, `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuBadge`, `SidebarMenuAction`, `SidebarFooter`, `SidebarInset`, `SidebarTrigger`, `DropdownMenu`, `Avatar`, `Progress` | `AppSidebar` |
| 6.15 | Pricing cards | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`, `Badge`, `Button` | `PricingCard` |
| 6.16 | 404 | `Empty` + `Button` (+ optional `InputGroup`) | none |
| 6.17 | Bento stat tile | `Card` (`size="sm"`), `CardDescription`, `CardTitle`, `Progress` | `StatTile` |
| — | Signature pieces | compositions above | `EvidenceChip`, `RelevanceMeter`, `PipelineRail`, `ActionDock` |

Common states for every interactive part:
- **Hover:** `bg-accent` (neutral, `surface-3`).
- **Focus-visible:** a full-strength `ring-ring` at 2px plus a 2px offset. **Never `ring-ring/50`**: it is 2.0:1 in light mode (§3.5).
- **Disabled:** `bg-muted text-muted-foreground` plus a stated reason. Never opacity alone.
- **Loading:** `Spinner` with `data-icon="inline-start"`, and the label stays.
- **Invalid:** `aria-invalid` + `FieldError`.

Icons: generated components import `lucide-react`; leave those as they are. Product icons stay Phosphor (regular weight, 16/20px). To match Phosphor's lighter stroke, set `strokeWidth={1.75}` on lucide icons in the few wrappers that show them prominently.

### 6.1 Button
**Use this:** `<Button variant size>`. For links, use `buttonVariants({ variant, size })` on `<Link>` (shadcn docs: don't make links into role=button).

| Evergreen | shadcn | Use |
|---|---|---|
| primary | `variant="default"` | One per view: "Build knowledge base", "Research" |
| secondary | `variant="outline"` | "Chat with results", "Retry", "Cancel" |
| subtle chip | `variant="secondary"` (+ `rounded-full`) | "Try" suggestions, filters |
| ghost | `variant="ghost"` | Toolbar, icon actions |
| danger | `variant="destructive"` | Delete (inside `InlineConfirm` only) |
| link | `variant="link"` | Inline navigation |

- **Sizes:** `sm` / `default` / `lg` / `icon` / `icon-sm`. Evergreen targets are 32 / 40 / 48px tall. If the generated cva heights differ, adjust them in `button.tsx` once.
- **Loading:** `<Button disabled aria-busy><Spinner data-icon="inline-start" />Building…</Button>`.
- **Do:** use verb labels and give icon-only buttons an `aria-label`.
- **Don't:** use arrow-suffixed lowercase labels, or two `default` buttons side by side. Never disable "Research" for an empty query; validate on submit instead (§3.3).

### 6.2 Search bar → `SearchBar`
**Use this:**
```tsx
<Field>
  <FieldLabel className="sr-only" htmlFor="q">Research topic</FieldLabel>
  <InputGroup className="h-13 rounded-lg">           {/* 52px, radius-lg 10px */}
    <InputGroupInput id="q" placeholder="Search a topic, e.g. sourdough for beginners" />
    <InputGroupAddon><MagnifyingGlass /></InputGroupAddon>                {/* inline-start (default) */}
    <InputGroupAddon align="inline-end">
      <Kbd>/</Kbd>
      <InputGroupButton variant="default" size="sm">Research</InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
  <FieldDescription className="font-mono tabular-nums">0 / 100 researches today</FieldDescription>
  <FieldError /> {/* "Enter a topic to research." */}
</Field>
```
- Place addons **after** the input in the DOM; that is the order the shadcn docs give for focus. Suggestions are `Button variant="secondary" size="sm" className="rounded-full"`.
- **States:**
  - Empty.
  - Focus: `ring-ring`.
  - Submitting: `InputGroupButton` shows a `Spinner`, and the input is `readOnly`.
  - Error: `FieldError`.
  - Quota reached: the button is disabled, and `FieldDescription` gives the reason and the reset time.

### 6.3 Video result row → `VideoResultRow`, `VideoResultCard`, `RelevanceMeter`
**Use this:**
```tsx
<Item variant="default" size="sm" data-selected={included}>
  <ItemMedia variant="image"><img src={thumb} alt="" width={120} height={68} /></ItemMedia>
  <ItemContent>
    <ItemTitle className="line-clamp-2">{title}</ItemTitle>
    <ItemDescription>{channel} · {duration?} · {published?}</ItemDescription>
    <ItemDescription className="text-foreground-secondary">{whyRelevant}</ItemDescription>
  </ItemContent>
  <ItemActions>
    <Badge variant="secondary">Substantial</Badge>
    <RelevanceMeter score={92} />                       {/* custom, see below */}
    <Checkbox aria-label={`Include ${title}`} checked={included} />
  </ItemActions>
</Item>
```
- **Fields:** keep the v1 field set: rank, thumbnail, title, channel · duration · date, discussion level, `whyRelevant`, relevance, include.
- **Views and duration:** the data model has **no view count** (gap, §11). Show duration and date only when present.
- **Selected:** `data-[selected=true]:bg-primary-subtle` plus a 2px `primary` left bar (`before:` pseudo-element).
- **Excluded:** title in `text-muted-foreground`. A video without captions gets `StatusBadge status="warning"` ("No captions, will be skipped").
- **Open on YouTube:** `buttonVariants({ variant: "link", size: "sm" })` on an `<a target="_blank">`. Don't wrap the whole `Item` in `render={<a/>}`; that would make it an external link and recreate the v1 bug.
- **`RelevanceMeter` (signature):** a mono score plus 5 segments (`bg-primary` for filled, `bg-muted` for empty; neutral below 40). It carries `role="img"` with `aria-label="Relevance 92 of 100"`, and a `Tooltip` explains how the score was computed.
- **Card variant:** `Card` with the image before `CardHeader` (the shadcn "Image" pattern), for the landing page and previews.

### 6.4 Lists & tables
- **Ranked list:**
  - `ItemGroup` with `ItemSeparator`s inside a `Card` with `p-0`, labeled "Sorted by relevance".
  - Pagination: show 20 rows, then a `Button variant="ghost"` "Show 24 more".
  - The raw scrape goes in a `Collapsible` ("Show all scraped (45)").
- **Tables** (usage, admin, MCP docs): `Table`. Numbers are right-aligned `font-mono tabular-nums`; the header row is `bg-muted text-foreground-secondary`. These replace `.docs-table`.
- **Long side panels:** `ScrollArea`.

### 6.5 Tabs / segmented
- **Page sections:** `Tabs` + `TabsList variant="line"` + `TabsTrigger`. The active underline in `primary` slides on change (motion pattern M10).
- **Filters / billing period:** single-select `ToggleGroup` + `ToggleGroupItem`.
- **Marketing header:** `NavigationMenu`. On mobile it becomes a `Sheet`, which is the allowed exception for navigation only.

### 6.6 Badges → `StatusBadge`, `PlanBadge`
**Use this:** `<Badge variant="secondary|outline|default">`. Status colors follow shadcn's custom-color pattern, applied with tokens:

| `StatusBadge status` | Classes | Icon |
|---|---|---|
| `queued` | `variant="secondary"` | Clock |
| `running` | `bg-primary-subtle text-primary-subtle-foreground` + `<Spinner data-icon="inline-start" />` | spinner |
| `stalled` / `warning` | `bg-warning-subtle text-warning` | Pause / Warning |
| `failed` | `bg-destructive-subtle text-destructive` | XCircle |
| `done` | `bg-success-subtle text-success` | CheckCircle |
| `info` | `bg-info-subtle text-info` | Info |

- **`PlanBadge`:** the name comes **only** from `getPlan(id).name`. Free is `variant="outline"`; paid is `bg-primary-subtle text-primary-subtle-foreground`. The names themselves are still **"Plan names pending Bharath."**

### 6.7 Progress & job status → `JobStatus`, `PipelineRail`
**Use this:**
```tsx
<Card size="sm">
  <CardHeader><CardTitle>Building "how to make sourdough bread"</CardTitle>
    <CardAction><Button variant="outline" size="sm">Cancel</Button></CardAction></CardHeader>
  <CardContent>
    <PipelineRail steps={steps} />                         {/* custom <ol> */}
    <Progress value={pct}>
      <ProgressLabel>7 of 20 videos</ProgressLabel><ProgressValue />
    </Progress>
    <Marker role="status"><MarkerIcon><Spinner /></MarkerIcon>
      <MarkerContent className="shimmer">Indexing: Bake the Perfect Sourdough…</MarkerContent></Marker>
  </CardContent>
</Card>
```
- **Stalled:** `<Alert>` with `bg-warning-subtle`, a Pause icon, an `AlertTitle` ("No progress for 1 min"), and an `AlertAction` holding [Keep waiting] and [Retry].
- **Failed:** `<Alert variant="destructive">` with the plain-language error, technical details in a `Collapsible`, and `AlertAction` → `Button` "Retry build".
- **Done:** `StatTile`s (videos, minutes, chunks, skipped) plus `Button` "Chat with this KB".
- **`PipelineRail` (signature):**
  - An `<ol>` of steps. Each step is a status dot plus a label plus a mono count (`Transcripts 12/20`).
  - Done steps show a success check. The active step has a `primary` ring with `animate-pulse-ring`. A failed step shows a destructive X.
  - A `Tooltip` on each step gives its timing.
- **State table:** queued / running / stalled / failed / done keep the v1 sources, copy and actions. `stalled` means `buildJob.updatedAt` is 45s or more old.
- **Accessibility:** `Progress` (Base UI) exposes progressbar semantics; set the value text to "7 of 20 videos". `Marker role="status"` announces step changes; that is the polite live region, and it fires on step change, not on every tick.
- **Sidebar rail:** `SidebarMenuBadge` shows "62%" or "failed".
- **Don't:** use rotating fake phrases.

### 6.8 Toasts
**Use this:** put shadcn `Toast` in `app/layout.tsx` as `<Toaster />`, then call `toast.add({ title, description, type, actionProps })`. `type` takes `success | info | warning | error | loading`.
- Use `toast.promise` for copy/export.
- Undo: `actionProps: { children: "Undo", onClick }`.
- Toasts confirm user actions only. Job failures live in `JobStatus`, never only in a toast.
- *(The Toast component is built on Base UI Toast. If you init with Radix, use whatever toast the CLI offers for that base and keep the same rules.)*

### 6.9 Empty states
**Use this:** `Empty` › `EmptyHeader` › `EmptyMedia variant="icon"` (Phosphor icon) + `EmptyTitle` + `EmptyDescription`, then `EmptyContent` › one `Button`.
- **KB list:** "No knowledge bases yet" / "Run a research, pick the best videos, and build a knowledge base you can chat with." / [Start a research].
- **Free plan gate:** "Knowledge bases are on paid plans" + [See plans].

### 6.10 Skeletons
**Use this:** `Skeleton` blocks shaped like the final layout (`VideoResultSkeleton`: 120×68 thumbnail, 2 lines, a meter stub). Use `SidebarMenuSkeleton` in the rail.
- Show skeletons only after 150ms.
- The container gets `aria-busy="true"` and an `sr-only` "Loading results".
- Under reduced motion they become static `bg-muted` blocks.

### 6.11 Sticky action bar → `ActionDock` (signature)
**Use this:**
```tsx
<Card size="sm" className="sticky top-2 z-20 rounded-xl data-[scrolled=true]:shadow-2 data-[scrolled=true]:bg-card/85 data-[scrolled=true]:backdrop-blur">
  <CardContent className="flex items-center justify-between gap-4">
    <p className="text-label"><span className="font-mono tabular-nums">20</span> of 44 selected · ~6.5 h</p>
    <ButtonGroup>
      <Button variant="outline">Chat with results</Button>
      <Button>Build knowledge base</Button>               {/* free plan: + <Badge variant="outline">Paid</Badge>, links to plans */}
    </ButtonGroup>
  </CardContent>
</Card>
```
- **While building:** the dock content swaps to a compact `JobStatus` ("Building… 7/20 · View progress").
- **Mobile:** the dock moves to the bottom of the screen (`bottom-2`, safe-area padding).
- Motion: pattern M6.

### 6.12 Chat with citations → `EvidenceChip`, `SourceList`, `ChatComposer`
**Use this:**
```tsx
<MessageScroller>                                          {/* conversation scroll container */}
  <Message align="end"><MessageContent><Bubble><BubbleContent>{question}</BubbleContent></Bubble></MessageContent></Message>
  <Message>                                                {/* assistant: no Bubble, 68ch prose */}
    <MessageContent>
      <Markdown components={{ cite: EvidenceChip }} />
      <SourceList sources={sources} />                     {/* Collapsible + ItemGroup */}
      {gaps && <Alert className="bg-info-subtle"><Info /><AlertTitle>Not covered by these videos</AlertTitle>
        <AlertDescription>{gaps}</AlertDescription></Alert>}
      <MessageFooter><Button size="icon-sm" variant="ghost" aria-label="Copy answer"><Copy /></Button></MessageFooter>
    </MessageContent>
  </Message>
  <Marker role="status"><MarkerIcon><Spinner /></MarkerIcon><MarkerContent className="shimmer">Searching your knowledge base…</MarkerContent></Marker>
</MessageScroller>
```
- **`EvidenceChip` (signature):**
  - Built as `HoverCard` › `HoverCardTrigger render={<a href={url + "&t=" + secs + "s"} target="_blank" />}` › `HoverCardContent` (thumbnail, title, excerpt).
  - The chip itself is `inline-flex rounded-xs bg-muted px-1.5 font-mono text-primary`, showing `▶ 12:34` followed by the channel in `text-foreground-secondary`.
  - The link works without the preview; touch and keyboard users get the same excerpt in `SourceList`. The hover card adds to that list and never replaces it.
- **`SourceList`:** a `Collapsible` that is open on the latest answer. Each source is an `Item` (thumbnail, title, timestamp, excerpt).
- **System notes:** `Marker variant="separator"` (e.g. "Knowledge base ready · 18 videos").
- **`ChatComposer`:** `InputGroup` › `InputGroupTextarea` + `InputGroupAddon align="block-end"` holding `InputGroupText` (quota, mono) and `InputGroupButton variant="default"` (Send). Enter sends; Shift+Enter adds a newline.
- **Don't:** show bare link lists, show a chip without a timestamp, or animate per token.

### 6.13 Confirms without modals → `InlineConfirm`
- The repo rule (`no-modals.mdc`) still stands, so `Dialog`, `AlertDialog` and `Drawer` are **not installed**.
- **`InlineConfirm`:** the trigger `Button variant="ghost"` swaps in place to an `Alert` saying "Delete 'sourdough'? This removes its chat history." with an `AlertAction` holding a `ButtonGroup` of [Delete (destructive)] and [Cancel (ghost)]. Focus moves to Cancel. This replaces `KbDeleteConfirmDialog`.
- **Allowed overlays:** anchored `Popover`, `DropdownMenu`, `HoverCard`, `Tooltip`, plus `Sheet` only as the mobile `Sidebar` and mobile nav.

### 6.14 Nav / sidebar → `AppSidebar`
**Use this:**
```tsx
<SidebarProvider style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}>
  <Sidebar collapsible="offcanvas" variant="sidebar">
    <SidebarHeader>{/* [tubecp] wordmark + New research Button variant="outline" */}</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel render={<Link href="/app/kb" />}>Knowledge bases</SidebarGroupLabel>
        <SidebarGroupAction aria-label="New research"><Plus /></SidebarGroupAction>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href={`/app/kb/${id}`} />} isActive={active}>{topic}</SidebarMenuButton>
            <SidebarMenuBadge>62%</SidebarMenuBadge>
            <SidebarMenuAction aria-label="KB options">{/* DropdownMenu: Rename, Export, Delete → InlineConfirm route */}</SidebarMenuAction>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>{/* usage Progress + account DropdownMenu (Avatar, PlanBadge) */}</SidebarFooter>
  </Sidebar>
  <SidebarInset>{children}</SidebarInset>
</SidebarProvider>
```
- **Active item:** `isActive` → `bg-sidebar-accent`, plus the Evergreen 2px `primary` left bar via `data-[active=true]:before:…`.
- **Account `DropdownMenu`:** grouped with `DropdownMenuGroup`, `DropdownMenuLabel` and `DropdownMenuSeparator` into Account / Preferences (theme via `DropdownMenuRadioGroup`) / Legal. Sign out is last, as a `DropdownMenuItem` with destructive text.
- The rail shows at most 8 KBs, then "View all". Each status badge has `sr-only` text.
- **Keyboard:** shadcn binds ⌘/Ctrl+B to toggle the sidebar. Keep that, and list it in the shortcut help.

### 6.15 Pricing cards → `PricingCard`
**Use this:** `Card` › `CardHeader` (`CardTitle` = plan name placeholder, `CardDescription` = who it's for, `CardAction` = `Badge` "Recommended") › `CardContent` (price `text-headline` + `/mo` caption, a limits checklist in mono from `lib/plans.ts`) › `CardFooter` (`Button`: default on the recommended card, outline on the others).
- **Recommended card:** `ring-1 ring-primary`, plus the once-only border beam (pattern M9).
- **Legal caveat:** `text-caption text-foreground-secondary`.
- **Current plan:** the footer shows `Badge` "Current plan" instead of a button.

### 6.16 404 page
**Use this:** `Empty` with `EmptyMedia` set to the `[404]` mono headline (primary-colored brackets), `EmptyTitle` "This page doesn't exist", and `EmptyContent` holding `Button` "Go to research" or "Go home" plus `Button variant="link"` "Your knowledge bases".
- The shadcn docs show an `Empty` + `InputGroup` search variant for 404s. That's optional here.
- Routing fix unchanged: `proxy.ts` must let unknown paths fall through to `not-found`.

### 6.17 Bento stat tile → `StatTile`
**Use this:** `Card size="sm" className="rounded-xl"` › `CardHeader` › `CardDescription` (overline) + `CardTitle className="font-mono text-title tabular-nums"`, with an optional `Progress`.
- Grid: `grid-cols-2 md:grid-cols-4`, and one `col-span-2` tile is allowed.
- Hover lift: pattern M4, on marketing pages and the KB list only.

---

## 7. Page motion (21st.dev-style)

**Use this:**
- **Library:** `framer-motion` (already in the repo) for choreography, CSS (`animate-*` utilities in the tokens file) for loops. Drop `gsap`.
- **Primitives:** wrap the app once in `<MotionConfig reducedMotion="user">`. Build pages from the 6 primitives in `components/motion/` (`Reveal`, `Stagger`, `HeroText`, `LiftCard`, `CountUp`, `ScrollFrame`). Never write ad-hoc `motion.div` timings in pages.
- **Ceilings:** marketing pages may use up to `--duration-hero` (720ms). App pages are capped at `--duration-slow` (360ms), except progress.

**Reference:** [21st](https://21st.dev) is a community registry of React + Tailwind components, published in shadcn registry format and installable with the shadcn CLI.
- **Categories we draw from:** [Hero Sections](https://21st.dev/community/components/s/hero), [Text Animation](https://21st.dev/community/components/s/text-animation), [Feature Sections](https://21st.dev/community/components/s/features), [Cards](https://21st.dev/community/components/s/card), [Pricing Sections](https://21st.dev/community/components/s/pricing-section), [Animated](https://21st.dev/community/components/s/animated), [Marquee](https://21st.dev/community/components/s/marquee), [AI Chat](https://21st.dev/community/components/s/ai-chat).
- **Motion-heavy libraries hosted there:** Magic UI, Aceternity UI, Motion Primitives.
- **Policy:** we **re-implement the patterns** below on our tokens rather than bulk-installing third-party blocks. If a 21st block is installed, it gets the same review as our own code: tokens only, keyboard and reduced-motion checks, and no new animation library. Note that 21st's free tier allows 2 copies/installs a day (per its llms.txt).
- **Reduced-motion API:** [Motion: accessible animations](https://motion.dev/docs/react-accessibility) (`MotionConfig reducedMotion="user"`, `useReducedMotion`).

### 7.1 Motion tokens (extends §5)

| Token | Value | Use |
|---|---|---|
| `--duration-fast` / `MOTION.duration.fast` | 140ms | hover, color, press |
| `--duration-base` / `.base` | 220ms | app enters, menus, list inserts |
| `--duration-slow` / `.slow` | 360ms | progress width, sheet, dock reveal |
| `--duration-reveal` / `.reveal` | **520ms** | section fade-up on scroll (marketing) |
| `--duration-hero` / `.hero` | **720ms** | hero headline line reveal |
| `--stagger-marketing` | **60ms** | children of a revealed section (cap 8) |
| `--stagger-app` | **30ms** | list rows on first paint (cap 8, then no delay) |
| `ease-out` | `[0.22, 1, 0.36, 1]` | default for every enter |
| `ease-in-out` | `[0.65, 0, 0.35, 1]` | position changes, scroll-linked |
| spring `lift` | `{ type: "spring", stiffness: 380, damping: 30 }` | card hover, chip pop |
| distance | 6px (app) / 16px (marketing) / 24px max | y-offset for enters |

`lib/motion.ts` changes to: `duration { fast: .14, base: .22, slow: .36, reveal: .52, hero: .72 }`, `stagger { marketing: .06, app: .03 }`, `distance { app: 6, marketing: 16 }`, and `spring.lift`. The CSS tokens drop to 0 under reduced motion.

### 7.2 Pattern library

| ID | Pattern (21st category) | Implementation | Timing | Reduced motion |
|---|---|---|---|---|
| **M1** | Section reveal: fade-up on scroll (Feature Sections) | `<Reveal>` = `m.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.25}}` | reveal 520ms, ease-out | opacity only (MotionConfig drops transform) |
| **M2** | Staggered children (Features, Cards) | `<Stagger>` parent `variants={{visible:{transition:{staggerChildren:.06, delayChildren:.08}}}}`; children use M1 variants | 60ms step, max 8 children | children appear together |
| **M3** | Hero line/word reveal (Text Animation, Hero) | `<HeroText>`: split into words, each in an `overflow-hidden` span; `y:"100%"→0`, `opacity 0→1`, `filter: blur(6px)→0` (desktop only); the sentence stays in the DOM as plain text with `aria-label`, and word spans are `aria-hidden` | 720ms, word stagger 40ms, ≤ 12 words | text shows instantly |
| **M4** | Bento card lift + spotlight (Cards) | `<LiftCard>` = `m.div whileHover={{y:-4}} transition={spring.lift}` + `shadow-1→shadow-3` + `ring-primary/30`. Optional spotlight: radial gradient at `--mx/--my` set on `pointermove` (marketing only) | spring | no lift, no spotlight; shadow change only |
| **M5** | Product shot "scroll frame" (Hero) | `<ScrollFrame>`: `useScroll({target, offset:["start end","end start"]})` → `useTransform` to `rotateX 12°→0`, `scale .96→1` over the first 40% | scroll-linked | static, no transform |
| **M6** | Sticky bar reveal (Navigation) | `useScroll` + `useMotionValueEvent(scrollY, "change")` sets `data-scrolled` once past 8px; CSS transitions shadow/blur/bg; on first appearance `y:-8→0` | slow 360ms | instant state change |
| **M7** | Count-up numbers (Dashboard) | `<CountUp>`: `animate(from, to, {duration:.9, ease})` when `useInView`; `tabular-nums`; the final value is in the DOM from the start (`aria-live` off) | 900ms once | final value immediately |
| **M8** | Marquee "works with" strip (Marquee) | CSS `translateX` loop, duplicated list `aria-hidden`; **pause/play `Button`** (WCAG 2.2.2) and pause on hover/focus. Only real MCP clients from `mcp/clients/*`, never fake logos | 30-40s loop | static row, no loop |
| **M9** | Border beam on recommended card (Pricing Sections, Animated) | conic-gradient pseudo-element rotating around `ring-primary`; **runs 2 loops when in view, then stops** | 2 × 3s | static `ring-primary` |
| **M10** | Tab indicator slide | `m.span layoutId="tab-underline"` inside the active `TabsTrigger` | base 220ms, ease-in-out | jumps |
| **M11** | Live list insert/reorder (AI Chat, Search) | `AnimatePresence` + `m.li layout` for streamed results; enter `opacity 0→1, y 6→0`; reorder animates `layout` | base 220ms, stagger 30ms ×8 | opacity only, no layout animation |
| **M12** | Progress & pulse | `Progress` indicator `transition-[width] duration-(--duration-slow)`; active step `animate-pulse-ring` (CSS); done step check `pathLength 0→1` 300ms; stalled stops the pulse | 360ms / 1.6s loop | width jumps, no pulse |
| **M13** | Streaming status shimmer (AI Chat) | shadcn `shimmer` utility on `MarkerContent` (from `shadcn/tailwind.css`) | while streaming | plain text |
| **M14** | Message / chip enter | new `Message`: `opacity 0→1, y 8→0`; `EvidenceChip` pops in `scale .96→1` (spring) when citations attach; **never animate per token** | base 220ms | opacity only |
| **M15** | Route content fade | `app/(product)/template.tsx` wraps children in `m.div initial={{opacity:0}} animate={{opacity:1}}`; no slide between app routes | fast 140ms | none |
| **M16** | Skeleton → content crossfade | `AnimatePresence mode="popLayout"`; skeleton exit opacity 0, content enter M11 | base 220ms | instant swap |

Rules:
- Animate only `opacity`, `transform` and `filter` (blur only in M3). Never animate layout-affecting properties outside `layout`.
- Load with `LazyMotion features={domAnimation}` and the `m` component to keep the bundle small.
- `viewport={{ once: true }}` everywhere; sections don't re-animate on scroll back.
- No scroll-jacking, no parallax in the app, and no autoplay loops over 5s without a pause control.
- One hero-grade effect (M3 or M5) per viewport.
- **Never animate focus or reading position:** streamed rows insert without moving the user's scroll (§9.1).

### 7.3 Page animation inventory

| Page | Sections and patterns |
|---|---|
| **Landing** (`/`) | Nav: M6 (glass + shadow after 8px). Hero: M3 headline ("YouTube research, distilled into answers you can trust"), subcopy + CTAs M1 at +200ms, search-bar preview M1 at +320ms. Product screenshot (results + citations, per v1 recommendation): M5. "How it works" 3 steps: M2 + M1, step numbers in mono. Bento feature grid (Ranked results, Evidence chips, KB chat, MCP server): M2 + M4 with spotlight. Inside the evidence tile, a looping demo of a chip hover (stops after 2 loops). MCP "works with" strip: M8 (real clients only). Stats (only real, sourced numbers; otherwise omit): M7. Final CTA: M1. |
| **Pricing** (`/pricing`) | Header: M1 (no M3, to keep it calm). Three `PricingCard`s: M2 (60ms) + M4 lift. Recommended card: M9 once. Limits checklist rows: M2 at 30ms inside the card. Plan names are pending Bharath; motion doesn't change with copy. Caveats: plain M1. |
| **About** (`/about`, **does not exist in the repo yet**; spec for when it's added) | Hero: M3 short line. Story blocks: M1 per section. Principles as a bento: M2 + M4 (no spotlight). Builder/contact card: M1. No M5/M8. Real name and details from Bharath only. |
| **Docs / MCP** (`/docs/mcp`) | No entrance motion except M1 on the quick-start card. Code blocks are static; the copy button gives toast feedback. |
| **Search home** (`/app`) | First paint: headline + `SearchBar` M1 with app distance (6px, base 220ms). "Try" chips M2 at 30ms. Recent KB tiles M2 + M4 (lift 2px, not 4). Submitting: the button shows a `Spinner`, and the page cross-fades to the research view (M15). |
| **Research running → Results** | `PipelineRail` M12. Results stream in with M11 (stagger only for the first 8; later rows enter with no delay). Rank changes animate with `layout`. `ActionDock` appears with M6 once results exist, and its count changes use M7 (no count-up longer than 300ms in the app). The "Show all scraped" `Collapsible` uses a height transition at base 220ms. |
| **KB list** (`/app/kb`) | Tiles M2 (30ms, cap 8) + M4 (2px lift). Building tiles: an inline `Progress` (M12) and a pulse dot. When a status flips to ready, the `StatusBadge` cross-fades with a single `scale .96→1` pop. |
| **KB build** (`/app/kb/[id]` building) | `JobStatus` card M1 on mount. Rail M12; the current-video `Marker` uses M13. Stalled: the pulse stops and the `Alert` enters M1 (no shake). Done: a success check draws in, the `StatTile`s count up (M7, ≤600ms), then the page transitions to chat (M15) with the "Knowledge base ready" `Marker` separator. |
| **Chat** (`/app/kb/[id]`) | Messages M14. Streaming status M13. Evidence chips pop as citations resolve (M14). `SourceList` `Collapsible` uses height at base 220ms. Composer: no motion. Starter chips: M2 at 30ms on an empty chat only. |
| **Billing** (`/account/billing`) | `StatTile`s M2 + M7 (usage numbers and `Progress` fill, once per visit). The warning/danger thresholds change color without motion. The inline confirm for cancellation swaps with M1. |
| **404** | `[404]` mono with M1. The brackets slide in 4px from each side (fast 140ms) once. |

### 7.4 Acceptance checks for motion
- [ ] With OS reduced motion on, no element moves (transform/layout); only opacity changes ≤220ms remain. Verify with Playwright `reducedMotion: "reduce"`.
- [ ] No animation delays the first interactive control by more than 200ms (the search input must be usable immediately).
- [ ] Marquee and any loop longer than 5s have a visible pause control; the border beam stops on its own.
- [ ] Streamed inserts never change `scrollTop` or move focus.
- [ ] Lighthouse CLS stays ≤ 0.1 on landing and results (skeletons reserve size, and the M5 frame has fixed dimensions).

---

## 8. Key screen patterns

### 8.1 Search home (`/app`)
```
┌ sidebar ┐┌──────────────────── max 720 ─────────────────────┐
│         ││  What do you want to research?        (headline) │
│         ││  We find YouTube videos, rank them by relevance, │
│         ││  and turn the best into a KB you can chat with.  │
│         ││  ┌───────────────────────────────────[Research]┐ │
│         ││  │ 🔍 Search a topic…                          │ │
│         ││  └─────────────────────────────────────────────┘ │
│         ││  Try: (chip) (chip) (chip)                       │
│         ││  0 / 100 researches today ▯▯▯▯▯▯▯▯▯▯   [PlanBadge]│
│         ││  ── Recent ─────────────────────────────────────  │
│         ││  [KB tile] [KB tile] [research tile]  (bento)    │
└─────────┘└──────────────────────────────────────────────────┘
```
Quota copy comes from `lib/plans.ts`. Remove the "Free: … Pro: 27 KB builds …" sentence.

### 8.2 Research running
Title + PipelineRail (Expand · Search · Analyze · Rank, each with counts) + bar + elapsed + [Cancel]. Results stream into the ranked list below as skeleton rows that fill in. Expanded queries are **hidden from users** (the design review agreed; they are available under "How we searched" for debugging, collapsed).

### 8.3 Results (single ranked list + dock)
```
Research: how to make sourdough bread                       (title)
44 relevant of 45 found · sorted by relevance                (caption)
┌ Action dock (sticky) ── 20 selected · ~6.5 h ── [Chat with results] [Build knowledge base] ┐
[Select top 20 ✓] [Select all] [Clear]        Filter: Substantial only ☐
01 ▢ thumb  Title…                         92 ▮▮▮▮▮
02 ▢ thumb  Title…                         88 ▮▮▮▮▯
…  (20 shown) [Show 24 more]
▸ Show all scraped (45)  ▸ How we searched
```
Ranked by `relevanceScore` desc (this fixes the 100, 72, 73 order). Top 20 are preselected (the number is a product decision). There is no second column.

### 8.4 KB list (`/app/kb`, which currently redirects)
Header "Knowledge bases" + [New research]. A bento grid of KB cards: topic (title-sm), status badge, mono stats (videos · minutes · chunks), last updated, and a row of up to 4 overlapping channel avatars or thumbnails. Building cards show inline JobStatus. Failed cards show the danger badge + [Retry]. Empty state per 6.9. Sort: building first, then most recent.

### 8.5 KB build progress (`/app/kb/[kbId]` while building)
```
Building "how to make sourdough bread"            [Cancel]
(●)Queued ─ (●)Transcripts 12/20 ─ (◉)Chunk ─ ( )Embed ─ ( )Index
████████████░░░░░░░░  60% · 7 of 20 videos · 02:14 elapsed
Now: Bake the Perfect Sourdough Bread… (Natashas Kitchen)
Skipped (2): No captions ▸
You can leave this page. Find it later in Knowledge bases.
```
Stalled and failed states replace the bar per 6.7. When done, it transitions in place to the chat view with a success summary as the first system message.

### 8.6 Chat with sources (`/app/kb/[kbId]`)
Glass header: topic (title), status, stats, [Sources (20)] toggle opens a right panel at ≥1280px (a route section or tab below that width; it is not a modal), and a ⋯ menu (Export, Delete → inline confirm). The message column is 720px max and the composer is pinned. Starter questions appear as chips on an empty chat.

### 8.7 Billing & plans (`/account/billing`)
Bento: [Current plan tile: PlanBadge, price, status badge, renewal line] [Usage tile: 3 meters for researches today / KB builds / chat messages, mono `3 / 30`, each meter turns warning at 80% and danger at 100%]. Renewal: if there is no real date (the 2100 sentinel), show "No renewal scheduled". Below: compact plan comparison (reuse pricing cards) and a separate "Danger zone" card with Cancel subscription (secondary danger, inline confirm).

---

## 9. Accessibility checklist and content rules

### 9.1 Accessibility (ship gate for every PR)
- [ ] Only token pairs from §3.4/§3.5 are used for text. New pairs get added to `tokens.py`/`shadcn_map.py` and must pass.
- [ ] Visible `:focus-visible` ring (2px full-strength `ring-ring`, 2px offset; never shadcn's `ring-ring/50`) on every interactive element; never `outline: none` without a replacement (the base layer sets `outline-none` on all controls today; remove that).
- [ ] Hit targets ≥ 24×24 (WCAG 2.2 2.5.8); 44×44 for primary and touch targets.
- [ ] Inputs have a visible `<label>`; errors are linked with `aria-describedby` and `aria-invalid`.
- [ ] Status is never conveyed by color alone (icon + text).
- [ ] Progress uses `role="progressbar"` + `aria-valuetext`; step changes are announced via a polite live region; job failures use `role="alert"`.
- [ ] Menus/popovers: Esc closes them, focus is trapped only in the mobile sheet, and focus returns to the trigger.
- [ ] Reduced motion respected: `MotionConfig reducedMotion="user"`, CSS tokens at 0, no shimmer/pulse/loops (see §7.4).
- [ ] Streamed or inserted content never moves scroll position or focus.
- [ ] Thumbnails `alt=""` when the title is adjacent; meaningful alt elsewhere.
- [ ] Zoom to 200% and widths down to 320px without horizontal scroll (results rows stack thumbnail above text below `sm`).
- [ ] Theme: respect `prefers-color-scheme` on first visit; persist the user's choice (existing ThemeProvider).

### 9.2 Voice & content
- Use plain words and sentence case. Buttons are verbs ("Build knowledge base", "Retry build", "Chat with results"). No trailing arrows in labels; use an icon if needed.
- Say "knowledge base" in full the first time on a screen, then "KB" is fine. Say "research" for the search job and "video" (not "scraped item").
- Numbers in mono with units: `7 of 20 videos`, `02:14`, `3 / 30 KB builds`.
- Errors give what happened, why if known, and what to do: "Build failed: none of the 20 videos had captions. Pick different videos or retry."
- Never show test or sentinel data (dates like 2100, "[Your name]").
- **Plan names: "Plan names pending Bharath."** Code currently has `free | pro | researcher | team` (Team hidden), pricing shows Free / Pro / Researcher, and the app empty state says "Pro: 27 KB builds". Until Bharath decides, every surface must render `getPlan(id).name` and the limits from `lib/plans.ts`. No hardcoded plan words or numbers in copy.

---

## 10. Migration

### 10.1 Token / class mapping (old → Evergreen → shadcn)

| Old (repo today) | Evergreen v1 | **Use now (v1.1, shadcn)** | Note |
|---|---|---|---|
| `--bg #eeeeee` / `#212121` | `bg` | `bg-background` | |
| `--surface #f7f7f8` / `#171717` | `surface` | `bg-card` / `bg-popover` / `bg-sidebar` | In dark mode, surface is now lighter than the background |
| none | `surface-2`, `surface-3` | `bg-muted` / `bg-secondary`; hover = `bg-accent` | |
| `--border` | `border` / `border-strong` | `border-border` (decorative) / `border-input` (controls) | |
| `--text` | `text` | `text-foreground` | |
| `--text-muted #6e6e80` | `text-secondary` / `text-muted` | `text-foreground-secondary` / `text-muted-foreground` | Most old muted body copy becomes secondary |
| `--accent #10a37f`, `text-accent`, `bg-accent`, `border-accent`, `.list-index`, links | `accent`, `accent-text` | **`primary`**: `bg-primary`, `text-primary`, `border-primary` | **Codemod; collides with shadcn `accent`** |
| `--accent-hover` | `accent-hover` | `bg-primary-hover` | Evergreen extension |
| `--accent-foreground #fff` | `accent-fg` | `text-primary-foreground` | Dark text on teal in dark mode |
| (selected rows) | `accent-subtle(-fg)` | `bg-primary-subtle text-primary-subtle-foreground` | |
| `var(--danger, #e53e3e)`, `#ef4444`, `#c53030`, `red-500/600` | `danger(-subtle,-fg)` | `destructive`, `destructive-subtle`, `destructive-foreground` | |
| `--success` (= accent) | `success` | `text-success`, `bg-success-subtle` | |
| `--warning` | `warning` | `text-warning`, `bg-warning-subtle` | |
| (focus outlines) | `focus` | `ring-ring` (**full opacity**) | Not `ring-ring/50` |
| `--glass-*` | — | `bg-card/85 backdrop-blur` + `shadow-2` | Sticky headers + dock only |
| `--motion-duration-*` (150/280/400) | 140/220/360 | same + `reveal 520`, `hero 720`, stagger 60/30 | `lib/motion.ts` |
| DM Sans ×2, broken `--font-mono` | Geist / Geist Mono | `font-sans` / `font-mono` → `--font-geist-*` | |
| `border-radius: 0 !important` | 4/6/10/14 | `rounded-xs/sm/lg/xl` (+ `md` 8 for controls) | §3.5 |
| `lib/cn.ts` (string join) | — | `cn` from `@/lib/utils` (clsx + tailwind-merge, CLI-generated); `lib/cn.ts` re-exports it | Class conflicts now merge correctly |
| `.btn-primary` / `.btn-ghost` / `.btn-block` / `.btn-row` | Button | `Button` default / outline / ghost + `w-full`; `ButtonGroup` | |
| `.split-field` / `SearchBox` | SearchBar | `InputGroup` + `Field` → `SearchBar` | |
| `.nav-tabs` / `.nav-tab` | Tabs | `Tabs` + `TabsList variant="line"`; marketing `NavigationMenu` | |
| `.plan-badge` | PlanBadge | `Badge` → `PlanBadge` | |
| `.list-row`, `VideoScrollPanel` ×2 | RankedVideoList | `ItemGroup`/`Item` → `RankedVideoList` + `Collapsible` scrape | |
| `KbBuildProgress`, `ProgressBar`, `PhasePanel`, `ResearchProgress`, `KbFailedPanel` | JobStatus / PipelineRail | `Card` + `Progress` + `Marker` + `Alert` | |
| `LoadingSpinner` | — | `Spinner` | |
| `UpgradePrompt`, `FreeTierTeaser` | Empty gate | `Empty` / `Alert` | |
| `.kb-delete-overlay`, `KbDeleteConfirmDialog` | InlineConfirm | `Alert` + `ButtonGroup` (no `AlertDialog`) | Restores the no-modals rule |
| `AppShell`, `.app-sidebar-*`, `KbSidebarItem`, `AppAccountMenu` | Sidebar | `Sidebar` family + `DropdownMenu` → `AppSidebar` | |
| `ChatPanel`, `.chat-message-*`, `.chat-panel-*` | ChatMessage / EvidenceChip | `MessageScroller`, `Message`, `Bubble`, `Marker`, `HoverCard`, `InputGroupTextarea` | |
| `CopyButton`, `.copy-field` | — | `InputGroup` + `InputGroupButton size="icon-xs"` + `toast` | |
| `PricingPlans`, `BillingPanel`, `UsageIndicator` | PricingCard / StatTile | `Card` + `Progress` + `Badge` | |
| `FadeIn`, `ScrollReveal`, `Stagger`, `AnimatedCollapse`, `.motion-*`, gsap | Motion | `components/motion/` (`Reveal`, `Stagger`, `HeroText`, `LiftCard`, `CountUp`, `ScrollFrame`); `Collapsible` | Remove gsap |
| `text-[10px]`…`text-[13px]` | type scale | `text-caption` / `text-label` | |

### 10.2 Adopting shadcn/ui (high level, read before Phase 1)

**Use this:** init once, paste the Evergreen tokens over the generated theme, then add components in the batches below. The repo uses npm (`package-lock.json`), so use `npx`.

1. **Init:** `npx shadcn@latest init` from the repo root.
   - **Base:** Base UI. This is the docs default and the one the examples in this doc use (`render` prop, `toast.add`). Radix is acceptable if the team prefers `asChild`, but **the style and base can't be changed after init** without reinstalling the components.
   - **Base color:** any; it gets overwritten.
   - **CSS variables:** yes (the default).
   - **`components.json`:** `tailwind.css: "app/globals.css"`, `tailwind.config: ""` (Tailwind v4), `rsc: true`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` (the existing `@/*` path in `tsconfig.json` already covers these).
   - Optional: `--pointer` (keeps `cursor: pointer` on buttons, as today).
2. **Theme:** in `app/globals.css`, keep the CLI's `@import "shadcn/tailwind.css"`. Replace its `:root`, `.dark`, `@custom-variant dark` and `@theme inline` blocks with `tubecp-tokens.css` (palette, semantic vars, theme, motion, legacy aliases).
   - Delete the old token block and these old base rules: the `*` `rounded-none`, `a:not(.btn-primary)… text-accent`, `outline-none` on controls, and `font-mono` on controls.
   - **Keep `data-color-scheme`.** The tokens file re-points the `dark:` variant to it.
3. **Codemod `accent` → `primary`** (one PR, before any shadcn component renders): `text-accent`, `bg-accent`, `border-accent`, `hover:text-accent-hover`, `var(--accent)`, `var(--accent-hover)`, `var(--accent-foreground)`, `.on-accent-fill` → the `primary` equivalents. Afterwards, grep for `accent` and expect only shadcn usages.
4. **Override after each `add` (the Evergreen guardrails):**
   - **Focus:** replace `ring-ring/50` and `outline-ring/50` with full-strength `ring-ring` (2px + offset). See the contrast note in §3.5.
   - **Disabled:** replace `disabled:opacity-50` on `Button` and `InputGroupButton` with `disabled:bg-muted disabled:text-muted-foreground`.
   - **Sizes:** Button heights 32/40/48. Card radius stays `rounded-xl` (14px, matches Evergreen lg).
   - **Icons:** leave the lucide imports in `components/ui/*`; product code uses Phosphor.
5. **Add components in batches** (each is one `npx shadcn@latest add …`):

| Batch | Components | Unblocks |
|---|---|---|
| A: primitives | `button button-group badge card spinner skeleton separator tooltip kbd` | Phase 2 buttons, badges, tiles |
| B: forms | `field input input-group textarea checkbox toggle-group` | SearchBar, composer, row selection |
| C: feedback | `progress alert empty toast` | JobStatus, empty states, toasts |
| D: structure | `item tabs collapsible scroll-area table` | Ranked list, sources, usage tables |
| E: navigation | `sidebar dropdown-menu avatar navigation-menu popover hover-card` | AppSidebar, account menu, EvidenceChip |
| F: chat | `message bubble marker message-scroller` | Chat + citations |
| Never | `dialog alert-dialog drawer` | Blocked by the `no-modals` rule (Sidebar pulls `sheet` for mobile, which is allowed) |

6. **21st.dev blocks (optional):** install through the shadcn CLI with the block's registry URL only after review (§7). Prefer re-implementing the pattern with `components/motion/`.

### 10.3 Phased rollout (sized for small cloud-agent runs)

| Phase | Scope | Size | Done when |
|---|---|---|---|
| **0. Decisions** | Bharath: plan names and limits, the "top 20 preselected" default, base library (Base UI recommended), About page yes/no | none | Recorded in `lib/plans.ts` and `components.json` |
| **1. shadcn init + tokens + fonts** (1 run) | §10.2 steps 1-4 with batch A. Geist fonts. Delete the radius/outline/font base rules. `accent → primary` codemod. Hardcoded reds → `destructive`. `MotionConfig reducedMotion="user"` + `LazyMotion` at the root | M | Existing screens render with the new tokens in both themes, and contrast issue #9 is closed. `rg "text-accent\|bg-accent"` returns only intended shadcn uses |
| **2. Primitives swap** (1 run) | Batches B-D. Replace `.btn-*`, `.split-field`, `.plan-badge`, `LoadingSpinner`, `CopyButton`. Add `SearchBar`, `StatusBadge`, `PlanBadge`, `StatTile`, `InlineConfirm`, `RelevanceMeter`. `components/motion/` primitives (M1, M2, M4, M7, M11) | M | No legacy `.btn-*` / `.split-field` classes. Playwright public-pages specs pass |
| **3. Research → KB flow** (1-2 runs) | `RankedVideoList` + `ActionDock` (review #3-5, M6, M11). `JobStatus`/`PipelineRail` with all 5 states + retry (review #2, L: server job status, M12/M13). `/app/kb` list (#1). `AppSidebar` (batch E) | M + L | `research-kb-chat.spec.ts` updated. A stall shows a warning within 45s. Reduced-motion e2e passes |
| **4. Chat, billing, marketing, 404** (1-2 runs) | Batch F chat + `EvidenceChip`/`SourceList` (M14). Billing tiles + "No renewal scheduled" (#7). `PricingCard` (#6, M9). Landing motion (M3, M5, M8). About page if approved. 404 + `proxy.ts` (#8). Delete legacy aliases, old CSS classes and gsap | M-L | `globals.css` has no legacy classes. §7.4 and §9.1 checklists pass. Lighthouse CLS ≤ 0.1 |

Each phase ships on its own. Phase 1 changes visuals but not flows, so it's the safest first PR.

---

## 11. Open items / not found in repo
- **shadcn/ui is not installed yet**: no `components.json`, `components/ui`, Radix, Base UI, `clsx` or `tailwind-merge`. `lib/cn.ts` is a plain string join. The adoption plan is in §10.2.
- **The Base UI vs Radix choice is permanent per install.** The doc assumes Base UI (the docs default). shadcn `Toast` is built on Base UI Toast.
- **No About page** exists in the repo (`app/` has landing, pricing, docs/mcp, legal, auth). Its motion spec is ready if one is added; real name and details come from Bharath.
- No `tailwind.config.*`. Tailwind v4 is CSS-first, so the theme lives in `globals.css` (matched in the tokens file).
- No command palette, and no view-count or duration fields on ranked videos.
- `queued` and `stalled` are not stored KB statuses (only `building | ready | failed`). `stalled` is derived from `buildJob.updatedAt`.
- **shadcn's default `ring-ring/50` fails non-text contrast in light mode** (2.0:1). It must be overridden on every added component (§10.2 step 4).
- Plan names: pending Bharath.
- Not reviewed: mobile screenshots (none were captured), so the mobile patterns are spec only.
