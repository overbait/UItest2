# Aoe4 Draft Overlay – Project Summary

## 1. Overview
This project is a **web-based overlay toolkit** for visualising real-time drafts for **Age of Empires IV**.
It provides two coordinated UIs:

| Window | Purpose | Typical User |
| ------ | ------- | ------------ |
| **Technical Interface** (`/technical`) | Manage draft, edit scores/names, drag-place UI elements, change fonts & colours, upload images | Caster, Tournament Admin |
| **Broadcast View** (`/broadcast`) | Transparent overlay for OBS / streaming software, mirrors all customised positions | OBS Browser-Source |

Both windows read live draft data (picks, bans, snipes, maps, timer, scores) via **REST + WebSocket** (or other data sources TBD) and are skinnable without code changes.

---

## 2. Key Features
### Core
* Draft ID auto-extraction from a relevant source (e.g. a tournament platform API or manual entry)
* Live data fetch and **socket.io** updates (or alternative real-time mechanism)
* Colour-coded actions – green = pick, red = ban, orange = snipe (customizable)
* Manual score & player-name controls
* Connection status & auto-reconnect

### Customisation
* **Drag-and-drop** positioning for every overlay element
* Font selector with bundled Google-fonts (Cinzel, Alegreya, Roboto, Inter, MedievalSharp)
* Global colour palette editor
* Image management – background, host/guest logos, unlimited custom images
* Animation engine (fade/slide/bounce/none, adjustable duration)

### AI / Automation
* One-click **JSON export** of current draft state (`DraftDataForAI`)
* Live WebSocket event stream suitable for real-time prediction bots
* Runtime Customisation API (`setPosition`, `setFont`, `setColor`, `setImage`, `setAnimation`)

---

## 3. Tech Stack
* **React 18** + **TypeScript**
* **Vite** build & dev-server
* **Tailwind CSS** (extended medieval palette)
* **Zustand** state store + `persist` to `localStorage`
* **socket.io-client** for draft live updates
* **Axios** for REST calls
* ESLint, strict TS config, fully typed domain models

---

## 4. Repository Structure
```
.
├── index.html                     # Vite HTML entry
├── vite.config.ts                 # Build / alias / proxy rules
├── tailwind.config.js             # Extended theme
├── src/
│   ├── main.tsx                   # React root
│   ├── App.tsx                    # Router, error boundary, navigation
│   ├── index.css                  # Tailwind layers & global vars
│   ├── types/
│   │   └── draft.ts               # Exhaustive TypeScript models
│   ├── store/
│   │   └── draftStore.ts          # Zustand state, API & WebSocket logic
│   └── pages/
│       ├── TechnicalInterface.tsx # Admin view (tabs, customisation panel)
│       └── BroadcastView.tsx      # Transparent overlay for OBS
├── public/favicon.svg             # AoE-style shield logo
└── README.md                      # End-user instructions
```

---

## 5. Usage
```bash
# install
npm install

# dev server (hot-reload)
npm run dev    # opens http://localhost:3000

# production build
npm run build  # outputs /dist
```
1. Open **Home** → paste draft link or ID → _Connect_.  
2. Technical window unlocks; **drag** elements, tweak fonts/colours.  
3. Press **“Open Broadcast View”** – add as browser source in OBS (1920×1080 & “Enable transparency”).  

---

## 6. Completed Work
✓ Project bootstrapped with Vite + Tailwind + strict TypeScript  
✓ Draft types & Zustand store with REST + WebSocket integration  
✓ Implemented full Technical Interface (drag, fonts, colours, images, animations)  
✓ Implemented Broadcast View – transparent, animated, responsive  
✓ AI JSON export & live event wiring  
✓ Production build passes `tsc --noEmit` and `vite build` with zero errors

---

## 7. Next Steps
| Priority | Task |
| -------- | ---- |
| ⚠️ | **GitHub Push** – repository push failed (auth); configure PAT or SSH and rerun `git push origin main` |
| ★ | Unit & component test suite (Vitest + React Testing Library) |
| ★ | Error-handling UI for missing images / API timeouts |
| ★ | Mobile / small-window layout tweaks |
| ☆ | Preset map thumbnails & civ icons for richer graphics |
| ☆ | CLI arguments or query-params for headless broadcast launch |
| ☆ | CI pipeline (lint, test, build) + automatic deploy to Vercel |

---

_Ready for casters to elevate Aoe4 draft coverage – customise, connect, and stream!_
