# Bun API App

A minimal TypeScript API server built with **Bun**.

## Features
- Simple HTTP server using Bun's built‑in `serve` API.
- TypeScript support out of the box.
- Ready to run with `bun dev` or `npm run dev`.

## Project Structure
```
/bun-api-app
├─ src/
│   └─ main.ts          # Entry point, HTTP server
├─ package.json          # Scripts for running the server
├─ tsconfig.json         # TypeScript configuration
└─ README.md            # This file
```

## Prerequisites
- Install **Bun** (https://bun.sh)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- Ensure `bun` is in your `PATH`.

## Glow2 Design Palette

Cyan (#38bdf8): Active links, logo accents, primary highlights.
Rose / Coral (#f43f5e): Post-quantum security badges and variant indicators.
Emerald (#10b981): Live Bun API status indicators and operational states.
Purple (#a855f7): Specialized padding and UI markers.
Yellow (#f78522): Telemetry highlights, payload hashes, and byte map tags.

## Getting Started
```bash
# Navigate to the project directory
cd bun-api-app

# Run the development server
bun dev
```

The server will start on **http://localhost:3000** and respond with a greeting at `/`.

## Extending the API
Add more routes by expanding the `fetch` handler in `src/main.ts` or extract route logic into separate modules.

## Building for Production
```bash
bun build src/main.ts --outfile dist/server.js
node dist/server.js
```
