PORT ?= 3009

.PHONY: dev

dev:
	PORT=$(PORT) pnpm --filter @september/web dev
