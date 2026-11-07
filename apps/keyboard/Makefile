# Keyboard: macOS app. README.md describes each target and the signing certificate.

CONFIG ?= release
BUILD_DIR := .build/$(CONFIG)
NAME := September Keyboard
VERSION := $(shell /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" Resources/Info.plist)
APP := $(BUILD_DIR)/$(NAME).app
DMG := $(BUILD_DIR)/September-Keyboard-$(VERSION).dmg
IDENTITY ?= $(shell security find-identity -v -p codesigning 2>/dev/null | grep -o '"Keyboard Dev"' | head -1 | tr -d '"')
# A local build has no secure timestamp. A release build sets --timestamp.
TIMESTAMP ?= --timestamp=none
# The release credentials, shared with the desktop release. The file is not
# in git, and a worktree has none, so pass ENVRC=<path> from a worktree.
ENVRC ?= ../../.envrc
SNAPSHOT_DIR ?= .build/snapshots

.PHONY: run dev test app dmg release publish icon open stop snapshots clean

# Runs unbundled as a child of this shell, so it inherits the terminal's own
# Accessibility permission — keys type into other apps with nothing to grant.
run:
	swift build
	exec .build/debug/Keyboard

# Same, but detached: the keyboard stays up while you keep using the terminal.
dev:
	swift build
	.build/debug/Keyboard &
	@echo "Keyboard running detached — stop it with: make stop"

test:
	swift test

app:
	swift build -c $(CONFIG)
	rm -rf "$(APP)"
	mkdir -p "$(APP)/Contents/MacOS" "$(APP)/Contents/Resources"
	cp "$(BUILD_DIR)/Keyboard" "$(APP)/Contents/MacOS/Keyboard"
	cp Resources/Info.plist "$(APP)/Contents/Info.plist"
	cp Resources/AppIcon.icns "$(APP)/Contents/Resources/AppIcon.icns"
	cp -R "$(BUILD_DIR)/Keyboard_SeptemberKit.bundle" "$(APP)/Contents/Resources/"
	cp -R "$(BUILD_DIR)/Keyboard_Keyboard.bundle" "$(APP)/Contents/Resources/"
	codesign --force --options runtime $(TIMESTAMP) \
		--entitlements Resources/Keyboard.entitlements \
		--sign "$(if $(IDENTITY),$(IDENTITY),-)" "$(APP)"
	@if [ -z "$(IDENTITY)" ]; then \
		echo "warning: signed ad-hoc — Accessibility permission will reset on the next build."; \
		echo "         create a 'Keyboard Dev' code-signing certificate to keep it."; \
	fi
	@echo "built $(APP)"

dmg: app
	@$(MAKE) dmg-only

# Signs the app and the DMG with the Developer ID of .envrc, notarizes both,
# staples both, and checks them with Gatekeeper. The app gets a ticket of its
# own, so it opens offline after the user copies it out of the DMG.
release:
	@set -eu; \
	test -f "$(ENVRC)" || { echo "Missing $(ENVRC). From a worktree, pass ENVRC=<path>."; exit 1; }; \
	. "$(ENVRC)"; \
	: "$${APPLE_SIGNING_IDENTITY:?Set APPLE_SIGNING_IDENTITY in .envrc}"; \
	: "$${APPLE_API_ISSUER:?Set APPLE_API_ISSUER in .envrc}"; \
	: "$${APPLE_API_KEY:?Set APPLE_API_KEY in .envrc}"; \
	: "$${APPLE_API_KEY_PATH:?Set APPLE_API_KEY_PATH in .envrc}"; \
	test -r "$${APPLE_API_KEY_PATH}" || { echo "Cannot read APPLE_API_KEY_PATH"; exit 1; }; \
	notarize() { \
		xcrun notarytool submit "$$1" \
			--key "$${APPLE_API_KEY_PATH}" --key-id "$${APPLE_API_KEY}" --issuer "$${APPLE_API_ISSUER}" \
			--wait --timeout 30m | tee "$(BUILD_DIR)/notary.log"; \
		grep -q "status: Accepted" "$(BUILD_DIR)/notary.log" || { echo "Notarization failed for $$1"; exit 1; }; \
	}; \
	$(MAKE) app IDENTITY="$${APPLE_SIGNING_IDENTITY}" TIMESTAMP=--timestamp; \
	codesign --verify --strict --deep --verbose=2 "$(APP)"; \
	zip="$(BUILD_DIR)/September-Keyboard-$(VERSION).zip"; \
	rm -f "$$zip"; \
	ditto -c -k --keepParent "$(APP)" "$$zip"; \
	notarize "$$zip"; \
	rm -f "$$zip"; \
	xcrun stapler staple "$(APP)"; \
	$(MAKE) dmg-only IDENTITY="$${APPLE_SIGNING_IDENTITY}" TIMESTAMP=--timestamp; \
	notarize "$(DMG)"; \
	xcrun stapler staple "$(DMG)"; \
	xcrun stapler validate "$(APP)"; \
	xcrun stapler validate "$(DMG)"; \
	spctl --assess --type execute --verbose=4 "$(APP)"; \
	spctl --assess --type open --context context:primary-signature --verbose=4 "$(DMG)"; \
	echo "Release ready: $(DMG)"; \
	shasum -a 256 "$(DMG)"

# The DMG of the app that is already built. The release staples the app
# before it makes the DMG.
.PHONY: dmg-only
dmg-only:
	@set -eu; \
	dmg_staging="$$(mktemp -d "$(BUILD_DIR)/dmg.XXXXXX")"; \
	trap 'rm -rf "$$dmg_staging"' EXIT; \
	ditto "$(APP)" "$$dmg_staging/$(NAME).app"; \
	ln -s /Applications "$$dmg_staging/Applications"; \
	rm -f "$(DMG)"; \
	hdiutil create -volname "$(NAME)" -srcfolder "$$dmg_staging" -ov -format UDZO "$(DMG)" >/dev/null; \
	if [ -n "$(IDENTITY)" ]; then codesign --force $(TIMESTAMP) --sign "$(IDENTITY)" "$(DMG)"; fi; \
	echo "built $(DMG)"

# Uploads the DMG of `make release` to a GitHub Release of sonnes/september,
# with the notes of this version from CHANGELOG.md. A 0.x version is a
# pre-release, as the desktop releases are, so it does not become the latest
# release of the repository.
publish:
	@set -eu; \
	test -f "$(DMG)" || { echo "Run make release first."; exit 1; }; \
	xcrun stapler validate "$(DMG)" >/dev/null; \
	notes="$$(mktemp)"; \
	trap 'rm -f "$$notes"' EXIT; \
	awk '/^## /{p = ($$2 == "$(VERSION)")} p' CHANGELOG.md > "$$notes"; \
	test -s "$$notes" || { echo "CHANGELOG.md has no section for $(VERSION)."; exit 1; }; \
	case "$(VERSION)" in 0.*) prerelease=--prerelease ;; *) prerelease= ;; esac; \
	gh release create "keyboard-v$(VERSION)" "$(DMG)" $$prerelease \
		--repo sonnes/september \
		--title "September Keyboard $(VERSION)" \
		--notes-file "$$notes"

# Makes Resources/AppIcon.icns from Resources/AppIcon.svg. Needs rsvg-convert
# (brew install librsvg), because sips cannot read SVG.
icon:
	@set -eu; \
	iconset="$$(mktemp -d)/AppIcon.iconset"; \
	mkdir -p "$$iconset"; \
	for size in 16 32 128 256 512; do \
		rsvg-convert -w $$size -h $$size Resources/AppIcon.svg -o "$$iconset/icon_$${size}x$${size}.png"; \
		rsvg-convert -w $$((size * 2)) -h $$((size * 2)) Resources/AppIcon.svg -o "$$iconset/icon_$${size}x$${size}@2x.png"; \
	done; \
	iconutil -c icns "$$iconset" -o Resources/AppIcon.icns; \
	rm -rf "$$(dirname "$$iconset")"; \
	echo "built Resources/AppIcon.icns"

open: app
	open "$(APP)"

stop:
	@pkill -f '\.build/(debug|release)/(September Keyboard\.app/Contents/MacOS/)?Keyboard' 2>/dev/null && echo "stopped" || echo "not running"

# Renders the keyboard and the component library to PNGs for comparing against
# the design mocks — no window, no permissions.
snapshots:
	@mkdir -p "$(SNAPSHOT_DIR)"
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-rainbow.png"
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-mono.png" --mono
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-light.png" --light
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-talk.png" --talk
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-write.png" --write
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-mine.png" --mine
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-clipboard.png" --clipboard
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/component-library.png" --gallery
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/tree-viewer.png" --viewer

clean:
	rm -rf .build
