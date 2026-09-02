PORT ?= 3009

.PHONY: dev desktop-dev desktop-build desktop-release server-dev deploy mac-run mac-dev mac-test mac-app keyboard-dmg mac-dmg mac-stop

dev:
	pnpm -C apps/web dev --port $(PORT)

# Independent Tauri desktop app with Rust-owned SQLite settings.
desktop-dev:
	pnpm -C apps/desktop tauri:dev

desktop-build:
	pnpm -C apps/desktop tauri:build

# Build, notarize, staple, and verify the macOS desktop DMG.
desktop-release:
	@set -eu; \
	test -f .envrc || { echo "Missing .envrc in the repository root"; exit 1; }; \
	. ./.envrc; \
	: "$${APPLE_TEAM_ID:?Set APPLE_TEAM_ID in .envrc}"; \
	: "$${APPLE_SIGNING_IDENTITY:?Set APPLE_SIGNING_IDENTITY in .envrc}"; \
	: "$${APPLE_PROVISIONING_PROFILE:?Set APPLE_PROVISIONING_PROFILE in .envrc}"; \
	: "$${APPLE_API_ISSUER:?Set APPLE_API_ISSUER in .envrc}"; \
	: "$${APPLE_API_KEY:?Set APPLE_API_KEY in .envrc}"; \
	: "$${APPLE_API_KEY_PATH:?Set APPLE_API_KEY_PATH in .envrc}"; \
	test -r "$${APPLE_PROVISIONING_PROFILE}" || { echo "Cannot read APPLE_PROVISIONING_PROFILE"; exit 1; }; \
	test -r "$${APPLE_API_KEY_PATH}" || { echo "Cannot read APPLE_API_KEY_PATH"; exit 1; }; \
	desktop_version="$$(node -p "require('./apps/desktop/src-tauri/tauri.conf.json').version")"; \
	case "$$(uname -m)" in \
		arm64) desktop_arch=aarch64 ;; \
		x86_64) desktop_arch=x64 ;; \
		*) echo "Unsupported Mac architecture: $$(uname -m)"; exit 1 ;; \
	esac; \
	dmg_path="apps/desktop/src-tauri/target/release/bundle/dmg/September_$${desktop_version}_$${desktop_arch}.dmg"; \
	pnpm -C apps/desktop tauri:build; \
	test -f "$${dmg_path}" || { echo "DMG was not created at $${dmg_path}"; exit 1; }; \
	xcrun notarytool submit "$${dmg_path}" \
		--key "$${APPLE_API_KEY_PATH}" \
		--key-id "$${APPLE_API_KEY}" \
		--issuer "$${APPLE_API_ISSUER}" \
		--wait; \
	xcrun stapler staple "$${dmg_path}"; \
	xcrun stapler validate "$${dmg_path}"; \
	spctl --assess --type open --context context:primary-signature --verbose=4 "$${dmg_path}"; \
	echo "Release ready: $${dmg_path}"; \
	shasum -a 256 "$${dmg_path}"

# Cloudflare Worker backend (Durable Objects + R2); serves the SPA in production.
server-dev:
	pnpm -C apps/server dev

# Build the web app and deploy the static asset Worker.
deploy:
	pnpm -C apps/server deploy

# Native macOS keyboard (apps/keyboard). See apps/keyboard/README.md.
# mac-run/mac-dev inherit this terminal's Accessibility permission; mac-app
# builds the signed bundle and keyboard-dmg packages it for installation.
mac-run:
	$(MAKE) -C apps/keyboard run

mac-dev:
	$(MAKE) -C apps/keyboard dev

mac-test:
	$(MAKE) -C apps/keyboard test

mac-app:
	$(MAKE) -C apps/keyboard app

keyboard-dmg:
	$(MAKE) -C apps/keyboard dmg

mac-dmg: keyboard-dmg

mac-stop:
	$(MAKE) -C apps/keyboard stop
