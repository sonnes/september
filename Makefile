PORT ?= 3009

.PHONY: dev

dev:
	pnpm -C apps/web dev --port $(PORT)
