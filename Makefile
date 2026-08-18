PORT ?= 3009

.PHONY: dev desktop-dev desktop-build server-dev deploy mac-run mac-dev mac-test mac-app mac-stop

dev:
	pnpm -C apps/web dev --port $(PORT)

# Tauri desktop app reusing the web UI with Rust-owned SQLite/files.
desktop-dev:
	pnpm -C apps/web desktop:dev

desktop-build:
	pnpm -C apps/web desktop:build

# Cloudflare Worker backend (Durable Objects + R2); serves the SPA in production.
server-dev:
	pnpm -C apps/server dev

# Build the web app and deploy the single Worker (assets + API). Pass the sync env:
#   make deploy VITE_SYNC_API_URL=https://... VITE_GOOGLE_CLIENT_ID=...
deploy:
	pnpm -C apps/server deploy

# Native macOS keyboard (apps/swift). See apps/swift/README.md.
# mac-run/mac-dev inherit this terminal's Accessibility permission; mac-app
# builds the signed bundle, which needs its own grant.
mac-run:
	$(MAKE) -C apps/swift run

mac-dev:
	$(MAKE) -C apps/swift dev

mac-test:
	$(MAKE) -C apps/swift test

mac-app:
	$(MAKE) -C apps/swift app

mac-stop:
	$(MAKE) -C apps/swift stop
