/**
 * Sparse Two-Panel Documentation Page (.tsx)
  * - Page background: #FFFAFA
 * - Card background: #FFFFFF
 * - Two panels: Left sidebar with Risukko (Twig) logo at top-left + Main content with 4 cards
 */

import { raw } from "./jsx-runtime";

const SIDEBAR_GROUPS = [
  {
    title: "User Guide",
    items: [
      "Welcome to GaloisOil",
      "Using GaloisOil",
      "Settings Overview",
    ],
  },
  {
    title: "Managing Algebra Strategically",
    items: [
      "Galois Field Domains",
      "Berlekamp-Massey & LFSR",
      "Golden Ratio (Φ²)",
    ],
  },
  {
    title: "How Do I Know GaloisOil is Working?",
    items: [
      "Analytics and Data",
      "Walk-Forward Backtest",
    ],
  },
];

const FOUR_CARDS = [
  {
    title: "User Guide",
    description:
      "GaloisOil like a pro! Quickstart guides for new users. Advanced topics for the GaloisOil pros.",
    iconPath:
      "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  },
  {
    title: "Developer Guide",
    description:
      "You’ll have GaloisOil set up in no time! Native Bun runtime, PBIN binary store, and more.",
    iconPath:
      "M12 2C6.48 2 3 3.79 3 6v12c0 2.21 3.48 4 9 4s9-1.79 9-4V6c0-2.21-3.48-4-9-4z M3 12c0 2.21 3.48 4 9 4s9-1.79 9-4",
  },
  {
    title: "API Guide",
    description:
      "Detailed API documentation for data ingestion, quantization, and LFSR predictions.",
    iconPath:
      "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  },
  {
    title: "Settings",
    description:
      "Read-only reference for GaloisSettings parameters, thresholds, and field configurations.",
    iconPath:
      "M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6",
  },
];

export function DocsPage() {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>GaloisOil Documentation</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>
          {raw(`
            html, body {
              background-color: #FFFAFA;
              color: #14213D;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
          `)}
        </style>
      </head>

      <body className="min-h-screen bg-[#FFFAFA] text-[#14213D] antialiased flex">
        {/* PANEL 1: Left Sidebar */}
        <aside className="w-72 shrink-0 border-r border-slate-200/80 bg-[#FFFAFA] min-h-screen px-7 py-6 flex flex-col justify-between">
          <div>
            {/* Top-Left Corner: Risukko (Twig) Logo */}
            <a href="/" className="flex items-center space-x-3 mb-8">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm p-1.5 shrink-0">
                <svg
                  version="1.0"
                  xmlns="http://www.w3.org/2000/svg"
                  width="100%"
                  height="100%"
                  viewBox="0 0 128.000000 128.000000"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g
                    transform="translate(0.000000,128.000000) scale(0.100000,-0.100000)"
                    fill="#ffffff"
                    stroke="none"
                  >
                    <path d="M1130 1261 c-5 -11 -10 -25 -10 -31 0 -19 -50 -113 -73 -138 -25 -27 -155 -109 -272 -172 -44 -23 -93 -52 -109 -63 -70 -49 -301 -185 -308 -181 -4 3 23 51 60 108 l66 104 65 7 c85 9 155 53 204 127 20 29 52 68 72 85 37 33 44 65 15 71 -13 2 -64 -44 -197 -180 -55 -56 -158 -66 -165 -15 -2 12 -11 23 -20 25 -15 3 -18 -4 -18 -35 0 -30 -13 -57 -64 -133 -84 -124 -154 -210 -192 -235 -17 -11 -65 -29 -107 -39 l-77 -18 0 -55 c0 -51 1 -54 22 -48 11 4 54 8 93 8 56 0 82 -5 114 -21 23 -12 49 -22 58 -22 20 0 348 -169 407 -209 23 -16 48 -36 55 -45 8 -9 21 -16 30 -16 33 0 61 -43 61 -93 0 -40 3 -47 19 -47 16 0 20 8 23 38 4 51 26 52 125 2 65 -32 91 -40 137 -40 48 0 56 3 56 18 0 14 -24 30 -88 60 -48 23 -95 42 -105 42 -23 0 -243 114 -287 149 -19 16 -46 32 -60 36 -37 11 -300 147 -300 155 0 8 450 33 550 30 41 -1 139 -2 218 -1 140 1 142 1 142 24 0 46 -7 47 -181 48 -90 0 -295 -3 -455 -7 -198 -5 -293 -4 -297 3 -9 14 28 41 213 154 85 53 218 134 295 181 77 48 166 98 197 111 31 14 74 37 95 51 20 14 48 26 61 26 30 0 82 39 82 62 0 24 -29 23 -91 -3 -27 -12 -52 -19 -56 -16 -3 3 6 36 21 72 14 36 26 70 26 75 0 18 -39 10 -50 -9z" />
                  </g>
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                GALOIS<span className="text-[#0284c7]">OIL</span>
              </span>
            </a>

            {/* Sparse Sidebar Navigation */}
            <nav className="space-y-6">
              {SIDEBAR_GROUPS.map((group) => (
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 mb-2.5 pl-2">
                    {group.title}
                  </h3>
                  <ul className="space-y-1 border-l border-slate-200 ml-2">
                    {group.items.map((item, idx) => (
                      <li>
                        <a
                          href="#"
                          className={`block pl-4 py-1.5 text-sm transition-colors ${idx === 0 && group.title === "User Guide"
                              ? "text-[#F78522] font-medium border-l-2 border-[#F78522] -ml-px"
                              : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200/80 text-xs font-mono text-slate-400">
            Read-Only Docs
          </div>
        </aside>

        {/* PANEL 2: Main Content Area */}
        <main className="relative flex-1 min-w-0 px-8 sm:px-14 py-12">
          {/* Upper-Right Corner Attribution */}
          <div className="absolute top-6 right-8 sm:right-10 text-xs text-slate-500">
            Part of Risukko Project. All rights reserved. ©Risto Ikonen 2026
          </div>

          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#F78522] mb-2">
                Navigation
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                GaloisOil Documentation
              </h1>
              <p className="mt-2 text-base text-slate-600">
                Explore our knowledge base to learn how to set up, use, and manage GaloisOil successfully
              </p>
            </div>

            {/* 4 Cards Grid (White background #FFFFFF on #FFFAFA page) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FOUR_CARDS.map((card) => (
                <div className="group rounded-2xl bg-white border border-slate-200/90 hover:border-[#F78522] px-6 py-5 transition-all cursor-pointer shadow-xs">
                  <div className="size-6 text-[#F78522]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d={card.iconPath} />
                    </svg>
                  </div>
                  <h2 className="font-semibold text-base text-slate-800 mt-4">
                    {card.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

export function renderDocsPageHtml(): string {
  return "<!doctype html>\n" + DocsPage().__html;
}
