.PHONY: setup check dev build contract
setup:
	pnpm install --frozen-lockfile
check:
	pnpm run check
dev:
	pnpm run dev
build:
	pnpm run build
contract:
	pnpm run generate:api
