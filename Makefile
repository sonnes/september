PORT ?= 3009

.PHONY: dev desktop-dev desktop-build server-dev deploy mac-run mac-dev mac-test mac-app mac-stop

dev:
	pnpm -C apps/web dev --port $(PORT)

# Independent Tauri desktop app with Rust-owned SQLite settings.
desktop-dev:
	pnpm -C apps/desktop tauri:dev

desktop-build:
	pnpm -C apps/desktop tauri:build

# Cloudflare Worker backend (Durable Objects + R2); serves the SPA in production.
server-dev:
	pnpm -C apps/server dev

# Build the web app and deploy the static asset Worker.
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
