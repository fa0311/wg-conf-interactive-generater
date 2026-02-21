# wg-conf-wizard

Interactive TypeScript CLI for generating WireGuard config files.

## Requirements

- Linux
- Node.js 20+
- pnpm

## Quickstart

```bash
pnpm install
pnpm dev
```

Build and run:

```bash
pnpm build
node dist/index.js
```

## Docker usage

Pull the latest image:

```bash
docker pull ghcr.io/fa0311/wg-conf-interactive-generater:latest
```

Run interactively and persist generated files to `./generated` on the host:

```bash
docker run --rm -it -v "$PWD/generated:/app/generated" ghcr.io/fa0311/wg-conf-interactive-generater:latest
```

Default base output directory is `./generated`.
