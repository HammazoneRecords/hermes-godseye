# Godseye View (VrushankPatel) — Reference Repo

## Location

`EARTH-MOON/godseye/` (cloned from https://github.com/VrushankPatel/godseye)

## What It Is

A frontend-only geospatial intelligence dashboard with a 3D tactical globe. Used as the reference implementation for the Godseye NVP visualization layer.

## Tech Stack

- React 19 + Vite 7 + Tailwind CSS 4
- Zustand 5 (state management)
- CesiumJS (3D globe)
- Firebase RTDB (real-time data)

## Features

- 3D tactical globe with CesiumJS
- 20+ live data layers: aircraft tracking, satellite orbits, weather warnings, CCTV streams, seismic activity, airspace monitoring
- Visual modes: NVG (night vision), FLIR (thermal), CRT (retro), God Mode (enhanced)
- Tactical HUD overlay
- Works without API keys (degrades gracefully)

## Repo Structure

```
src/
├── App.jsx              — Main app component
├── components/          — UI components (HUD, layers, controls)
├── layers/              — Data layer definitions
├── services/            — Data fetching services
├── store/               — Zustand state store
├── types/               TypeScript type definitions
├── utils/               Utility functions
├── constants/           Constants and configuration
├── index.css            — Global styles
└── main.jsx             — Entry point
```

## Relevance to Our Godseye

The Godseye View repo is the reference for:
- 3D globe visualization (agents as orbiting nodes)
- Layer architecture (data feeds as toggleable layers)
- Visual modes (NVG, FLIR, CRT as metaphor for different verification states)
- HUD design (metrics, queues, warnings displayed on the dashboard)

Our Godseye agent (scaffolded in PLUTO) uses the same conceptual model:
- Agents appear as nodes/stations/orbiting bodies
- Task packets appear as flight paths
- Altitude = confidence/priority/uncertainty
- Color = fact/hypothesis/correction
- Globe = shared knowledge space

## Key Difference

Godseye View is a geospatial OSINT dashboard (real-world data). Our Godseye is an agent activity visualization (AI agent metadata). The architecture and visualization patterns are shared, but the data sources are different.
