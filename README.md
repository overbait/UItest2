# AoE4 Draft Overlay

Real-time overlay and management suite for **Age of Empires II Captains-Mode drafts**.  
It provides a **technical interface** for tournament admins/casters and a **broadcast view** with a fully transparent background for OBS or any streaming software.

---

## Table of Contents
1. [Features](#features)
2. [Architecture](#architecture)
3. [Getting Started](#getting-started)
4. [Connecting to a Draft](#connecting-to-a-draft)
5. [Using the Technical Interface](#using-the-technical-interface)
6. [Broadcast View](#broadcast-view)
7. [API & Real-Time Data Flow](#api--real-time-data-flow)
8. [AI / Automation Hooks](#ai--automation-hooks)
9. [Customization](#customization)

12. [License & Credits](#license--credits)

---

## Features

| Area | Highlights |
|------|------------|
| **Core** | • Live draft data (picks, bans, snipes, maps, player names, scores)<br>• Auto-detect `draftId` from any *aoe2cm.net* observer link<br>• WebSocket updates with sub-second latency |
| **Technical Window** | • Drag-and-drop positioning of every element<br>• In-app font, colour and image management<br>• Manual score editing & player rename<br>• JSON export button for AI / overlays |
| **Broadcast Window** | • 100 % transparent background – no chroma-key needed<br>• Mirror of positions configured in the technical view<br>• Animated transitions (fade / slide / bounce) |
| **AI / Extensibility** | • Structured JSON object of current draft state<br>• Live *socket.io* event stream (`draftUpdate`, `turnTimerUpdate` …)<br>• Runtime customisation API `setPosition`, `setFont`, … |
| **Tech-Quality** | • React 18 + TypeScript + Vite + Tailwind CSS<br>• Zustand state store (persisted)<br>• ESLint + Prettier + strict TS settings |

---

## Architecture

```text
┌──────────────┐    REST / WS     ┌─────────────────────┐
│ aoe2cm.net   │  ─────────────▶ │ Draft Overlay Store │
│ (or local    │                 │ (Zustand + sockets) │
│  aoe2cm2)    │ ◀─────────────  └─────────────────────┘
└──────────────┘   actions / ack        │
                (picks, bans …)         │
                                         ▼
              ┌─────────────────────────────────────────────┐
              │ React Frontend                             │
              │  • /technical – management & settings       │
              │  • /broadcast – OBS overlay (transparent)   │
              └─────────────────────────────────────────────┘
```

Backend server is **optional** – by default the app talks directly to `https://aoe2cm.net`; you may run the open-source [aoe2cm2](https://github.com/SiegeEngineers/aoe2cm2) locally for offline dev or tournaments.

---

## Getting Started

```bash
# 1. Clone your GitHub fork
git clone https://github.com/<you>/aoe2-draft-overlay.git
cd aoe2-draft-overlay

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
# Vite opens http://localhost:3000
```

After first run the browser shows the **Home** page where you can paste a draft URL or ID.

### Prerequisites
* **Node.js ≥ 18** (ES2022)
* Optional: local aoe2cm2 server → `git clone ... && npm install && npm run build`

---

## Connecting to a Draft

You may supply **either**:
* A full observer link  
  `https://aoe2cm.net/draft/12345?tab=observer`
* A bare draft id  
  `12345`

The overlay extracts the id, requests the initial draft state via `GET /api/draft/:id`, then upgrades to WebSocket for real-time updates.

Connection status is shown in the header:
```
•  Connected: ID 12345
```

---

## Using the Technical Interface

Open **“Technical Interface”** after connecting.

### Tabs
| Tab | Purpose |
|-----|---------|
| **Draft Data** | Live view of turns, picks/bans, manual score edits |
| **Customize** | Drag elements, select fonts, colours, upload background & logos, tune animations |
| **AI Integration** | Copy-ready JSON export of the current draft state |

All changes are persisted in localStorage (`aoe2-draft-overlay-storage`) – refresh-safe.

---

## Broadcast View

* Opens in a new tab (`/broadcast`) – ready for **OBS “Browser Source”**  
  Recommended settings: *Width = 1920, Height = 1080, Enable transparency*.
* Mirror positions, fonts, colours and images configured in the technical window.
* Colour legend: **green = pick**, **red = ban**, **orange = snipe**.
* Connection indicator appears bottom-right if the socket drops.

---

## API & Real-Time Data Flow

| Endpoint | Purpose |
|----------|---------|
| `GET /api/draft/:id` | Fetch full `DraftState` JSON |
| `GET /api/civilizations` | List civ meta data |
| `GET /api/maps` | List map meta data |
| WebSocket `draftUpdate` | Pushes every state mutation |
| WebSocket `turnTimerUpdate` | Countdown seconds remaining |
| WebSocket `draftAction` (ack) | Result of a pick/ban initiated by admins |

If `VITE_PROXY=/api -> https://aoe2cm.net` is not reachable, set  
`VITE_API_BASE=http://localhost:5000` to talk to a self-hosted aoe2cm2.

---

## AI / Automation Hooks

```ts
import io from 'socket.io-client';

const socket = io('http://localhost:3000'); // same origin
socket.on('draftUpdate', (event) => console.log(event.data.draft));

/* Example command – move guest score while stream is running */
socket.emit('customization', {
  type: 'setPosition',
  element: 'guestScore',
  value: { x: 1600, y: 40 },
});
```

Current draft summary (`/technical → AI Integration → Copy`) looks like:

```json
{
  "draftId": "12345",
  "presetId": "bo3_standard",
  "host": {
    "name": "PlayerA",
    "score": 1,
    "picks": ["Franks", "Aztecs"],
    "bans": ["Chinese"],
    "snipes": []
  },
  "guest": {
    "name": "PlayerB",
    "score": 1,
    "picks": ["Japanese"],
    "bans": ["Mayans"],
    "snipes": []
  },
  "maps": {
    "picks": ["Arabia"],
    "bans": ["Arena"]
  },
  "currentTurn": 4,
  "status": "inProgress"
}
```

---

## Customization

| Element | How |
|---------|-----|
| **Positions** | Drag handles in **Customize → Element Positioning** or programmatic `setPosition` |
| **Fonts** | Choose among pre-bundled Google-fonts or add your own in `index.html` |
| **Colours** | Instant colour picker; supports HEX & RGB |
| **Images** | Background, host/guest logos, unlimited custom overlays |
| **Animations** | Toggle on/off, set duration, type (`fade`, `slide`, `bounce`) |

---



*### Static Hosting*  
```bash
npm run build           # Generates /dist
rsync -av dist/ user@server:/var/www/overlay
```

*### GitHub Pages* (SPA)  
```bash
npm run build
npx gh-pages -d dist
```

---


---

## License & Credits

* **License:** MIT – do whatever you want but no warranty.
* Uses assets and draft logic from [**aoe2cm.net**](https://aoe2cm.net/) by **Siege Engineers** under Microsoft © *Game Content Usage Rules*.
* Inspired by work of **HSZemi**, **SamuelMeilleur**, and the wider AoE II community.  
  Thank you for keeping competitive drafting awesome!
