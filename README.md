# wg-conf-wizard

Interactive TypeScript CLI for generating WireGuard config files.

## Requirements

- Linux
- Node.js 20+
- pnpm

## Usage

```bash
pnpm install
pnpm dev
```

Build and run:

```bash
pnpm build
node dist/index.js
```

Generated files:

- `<outputDir>/server/wg0.conf`
- `<outputDir>/peers/peerN/peerN.conf`
- `<outputDir>/root.key`
- `<outputDir>/server.json`

## Quality checks

```bash
pnpm lint
pnpm check
pnpm test
```
