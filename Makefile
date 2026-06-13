PORT ?= 3009

.PHONY: dev

dev:
	pnpm --filter @september/web dev --port $(PORT)
