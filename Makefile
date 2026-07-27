PORT ?= 3009

.PHONY: dev server-dev deploy mac-run mac-test mac-app

dev:
	pnpm -C apps/web dev --port $(PORT)

# Cloudflare Worker backend (Durable Objects + R2); serves the SPA in production.
server-dev:
	pnpm -C apps/server dev

# Build the web app and deploy the single Worker (assets + API). Pass the sync env:
#   make deploy VITE_SYNC_API_URL=https://... VITE_GOOGLE_CLIENT_ID=...
deploy:
	pnpm -C apps/server deploy

# Native macOS keyboard (apps/swift). See apps/swift/README.md.
mac-run:
	$(MAKE) -C apps/swift run

mac-test:
	$(MAKE) -C apps/swift test

mac-app:
	$(MAKE) -C apps/swift app
