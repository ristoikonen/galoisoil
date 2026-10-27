cat << 'EOF' > README.md

\# BunOliPipeline (Stage 1)



A high-performance, decoupled commodities tracking stack built natively with the \*\*Bun Runtime\*\* and \*\*TypeScript\*\*. 



\## Repository Blueprint

```text

oil-ingestion-pipeline/

├── package.json         # Runtime dependency matrix

├── trend-analysis.ts    # Mathematical OLS trend calculus engine

├── pipeline.ts          # App 1: Ingestion, filter, and storage daemon

├── server.ts            # App 2: Read-only live HTML web view

└── .env.local           # Private development environment keys (GIT IGNORED)

```

EOF



