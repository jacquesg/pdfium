# PDFium Demos

Working examples demonstrating how to use `@scaryterry/pdfium` in different environments. Each demo is self-contained and includes detailed documentation.

## Available Demos

| Demo | Environment | Build Tools | Description |
|------|-------------|-------------|-------------|
| [node](./node/) | Node.js | None (tsx) | Server-side PDF processing |
| [plain](./plain/) | Browser | None | Minimal HTML + ES modules |
| [vite](./vite/) | Browser | Vite + React | Modern frontend setup |

## Quick Start

All demos support two modes: **development** (from cloned repository) and **standalone** (from npm package).

### Development Mode

Run demos directly from the cloned repository:

```bash
# 1. Build the main package
pnpm build

# 2. Run the setup script
pnpm tsx demo/scripts/setup.ts

# 3. Run a demo
pnpm tsx demo/node/index.ts              # Node demo
python3 -m http.server 8080              # Plain demo (open /demo/plain/index.html)
pnpm --dir demo/vite install && pnpm --dir demo/vite dev  # Vite demo
```

### Standalone Mode

Generate a self-contained demo that uses the published npm package:

```bash
# Generate standalone demo
pnpm tsx demo/scripts/make-standalone.ts <demo> <output-dir>

# Examples
pnpm tsx demo/scripts/make-standalone.ts node /tmp/pdfium-node-demo
pnpm tsx demo/scripts/make-standalone.ts vite /tmp/pdfium-vite-demo

# Then run
cd /tmp/pdfium-node-demo
npm install
npm start
```

## Choosing a Demo

### Node Demo

**Best for**: Server-side PDF processing, CLI tools, backend services.

- Automatic WASM loading from node_modules
- File system access for reading PDFs
- No browser dependencies

### Plain Demo

**Best for**: Understanding the fundamentals, minimal setups, legacy projects.

- No build tools required
- Uses import maps for module resolution
- Shows manual WASM binary loading
- Works with any HTTP server

### Vite Demo

**Best for**: Modern frontend applications, React projects, production apps.

- React Query integration
- Vite's `?url` import for WASM
- TypeScript throughout
- Production-ready patterns

## Directory Structure

```
demo/
├── README.md              # This file
├── .gitignore             # Ignores generated files
├── shared/
│   └── sample.pdf         # Shared test PDF
├── scripts/
│   ├── setup.ts           # Development setup
│   └── make-standalone.ts # Standalone generator
├── node/
│   ├── README.md          # Node demo documentation
│   ├── package.json       # Node demo dependencies
│   └── index.ts           # Node demo source
├── plain/
│   ├── README.md          # Plain demo documentation
│   ├── index.html         # Development version
│   └── standalone.html    # Standalone template
└── vite/
    ├── README.md          # Vite demo documentation
    ├── package.json       # Vite demo dependencies
    └── src/               # React components
```

## Setup Script

The setup script (`demo/scripts/setup.ts`) prepares the development environment:

- Verifies prerequisites (package built, WASM downloaded)
- Copies `sample.pdf` to each demo directory
- Copies `pdfium.cjs` to required locations

Run it after cloning the repository and building the package:

```bash
pnpm tsx demo/scripts/setup.ts
```

## Standalone Generator

The standalone generator (`demo/scripts/make-standalone.ts`) creates self-contained demos:

- Generates proper `package.json` with npm dependencies
- Copies all necessary source files
- Includes setup scripts for browser demos
- Creates appropriate README

```bash
pnpm tsx demo/scripts/make-standalone.ts <demo> <output-dir>
```

## Common Requirements

All demos require:

- **Node.js 22+**: For `using` keyword support (explicit resource management)
- **pnpm**: For development mode (npm works for standalone)

Browser demos additionally need:

- **Modern browser**: Chrome 89+, Firefox 108+, Safari 16.4+
- **HTTP server**: Cannot run from `file://` due to CORS

## Troubleshooting

### WASM binary not found

```bash
# Download the WASM binary
pnpm download:pdfium --target wasm
```

### Package not built

```bash
# Build the main package
pnpm build
```

### Missing pdfium.cjs

```bash
# Run the setup script
pnpm tsx demo/scripts/setup.ts
```

See individual demo READMEs for demo-specific troubleshooting.
