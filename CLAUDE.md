# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
# Local dev server (http://localhost:3000)
npx serve .

# Deploy: push to Vercel — no build step, pure static files
```

There is no build, transpile, or bundle step. All files are served as-is.

## Architecture

**PitchRank** is a vanilla JS single-page PWA for halı saha / futsal player rating and statistics. It supports two teams (Haldunalagaş and Arion FC), each backed by a separate Google Apps Script deployment.

### Boot flow

1. `index.html` loads `css/base.css`, `css/main.css`, `js/app.js`, `js/boot.js` (deferred)
2. `boot.js` fetches every `[data-include]` element's HTML file and injects it into the DOM
3. After all components are injected, `boot.js` calls `window.initApp()`
4. `initApp()` reads `localStorage` for `pitchrank_selected_team`:
   - **null** → shows `#screen-home` (team selection), hides app and nav
   - **set** → hides home, shows `#app` and `.bottom-nav`, runs the full app

### Component structure

```
index.html                  ← shell, loads everything
js/
  boot.js                   ← fetches data-include components, calls initApp()
  app.js                    ← entire app logic (~2500 lines)
components/
  home.html                 ← team picker (haldunalagas / arion)
  app.html                  ← main app screens (puanla, siralama, istatistik, takim, yayin)
  nav.html                  ← bottom navigation bar
  modals.html               ← all modal dialogs (profile, pin, confirm, teamConfirm, success)
  toast.html                ← toast notification container
css/
  base.css                  ← CSS variables, reset, shared primitives
  main.css                  ← component styles
app gs.txt                  ← Google Apps Script source (copy into GAS editor to deploy)
```

### State and storage

All localStorage/sessionStorage keys are prefixed with the active team ID via `getStorageKey(key)`:

```js
// e.g. "haldunalagas_hs_players", "arion_hs_players"
lGet(k) / lSet(k, v) / lRem(k)   // localStorage
sGet(k) / sSet(k, v) / sRem(k)   // sessionStorage
```

`PLAYERS_VERSION` (currently `'6'`) triggers a cache wipe when bumped — increment it whenever the player data schema changes.

### Google Apps Script (backend)

`TEAM_CONFIG` in `app.js` maps each team to its GAS deployment URL. The `gs(params)` function sends GET requests to the active team's endpoint with up to 2 retries. The GAS `doGet(e)` router (in `app gs.txt`) dispatches on `e.parameter.action`.

Key rules for the GAS file:
- `SHEET_ID` must be just the spreadsheet ID, not the full URL
- `e.parameter` values are already URL-decoded — never double-decode with `decodeURIComponent()`
- Deploy with "Execute as: Me" and "Who has access: Anyone"

### Adding a new team

1. Create a new Google Sheet and deploy a copy of `app gs.txt` as a Web App
2. Add an entry to `TEAM_CONFIG` in `app.js` with `id`, `name`, `emoji`, `color`, `logo`, `gs`
3. Add a button to `components/home.html` calling `showTeamConfirm('newTeamId')`

### XSS and event handlers

All player names rendered into `innerHTML` must go through `escHtml(s)`. For `onclick` attributes, use `data-*` attributes and read them in the handler (`this.dataset.name`) instead of interpolating values directly into the attribute string.

### Screens and navigation

The main app has 5 screens switched via `switchMainScreen(name, btn)`: `puanla`, `siralama`, `istatistik`, `takim`, `yayin`. Each maps to a `#screen-{name}` element inside `app.html`. Statistics sub-screens are toggled with `setStatScreen()`.

### Modals

All modal overlays use `.mbg` + `.mbg.open` CSS classes. ESC key closes any open `.mbg` modal (global listener at bottom of `app.js`). Clicking the overlay backdrop closes it via `onclick="if(event.target===this)this.classList.remove('open')"`.

### Week format

Weeks are formatted as `YYYY-HWW` (e.g. `2026-H15`). Manual week override is stored in sessionStorage and reset with `resetWeekToAuto()`.

### Rating system

Seven criteria: `Pas, Sut, Dribling, Savunma, Hiz / Kondisyon, Fizik, Takim Oyunu`. Position weights (`POS_WEIGHTS`) scale each criterion differently per position (KL, DEF, OMO, FRV). Scores are 1–10 sliders; overall rating is a weighted average scaled to 0–99.

### Deployment

`vercel.json` routes all paths to `index.html` (SPA fallback). Asset cache strategy: `assets/` → immutable (1 year), `css/` and `js/` → stale-while-revalidate (1 day fresh, 7 day stale). Bump `?v=X` query strings on CSS/JS links in `index.html` when deploying breaking changes.
