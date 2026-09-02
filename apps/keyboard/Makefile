# Keyboard — macOS app
#
# Accessibility permission is granted to a (bundle id, code signature) pair.
# Signing ad-hoc mints a new signature on every build, which revokes the
# permission each time, so `make app` prefers a stable self-signed identity.
# Create one once (Keychain Access ▸ Certificate Assistant ▸ Create a
# Certificate…, name "Keyboard Dev", type "Code Signing"), then rebuilds keep
# their permission. See README.md.

CONFIG ?= release
BUILD_DIR := .build/$(CONFIG)
APP := $(BUILD_DIR)/Keyboard.app
DMG := $(BUILD_DIR)/Keyboard.dmg
IDENTITY ?= $(shell security find-identity -v -p codesigning 2>/dev/null | grep -o '"Keyboard Dev"' | head -1 | tr -d '"')
SNAPSHOT_DIR ?= .build/snapshots

.PHONY: run dev test app dmg open stop snapshots clean

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
	swift run KitTests

app:
	swift build -c $(CONFIG)
	rm -rf "$(APP)"
	mkdir -p "$(APP)/Contents/MacOS" "$(APP)/Contents/Resources"
	cp "$(BUILD_DIR)/Keyboard" "$(APP)/Contents/MacOS/Keyboard"
	cp Resources/Info.plist "$(APP)/Contents/Info.plist"
	cp -R "$(BUILD_DIR)/Keyboard_SeptemberKit.bundle" "$(APP)/Contents/Resources/"
	codesign --force --options runtime --timestamp=none \
		--entitlements Resources/Keyboard.entitlements \
		--sign "$(if $(IDENTITY),$(IDENTITY),-)" "$(APP)"
	@if [ -z "$(IDENTITY)" ]; then \
		echo "warning: signed ad-hoc — Accessibility permission will reset on the next build."; \
		echo "         create a 'Keyboard Dev' code-signing certificate to keep it."; \
	fi
	@echo "built $(APP)"

dmg: app
	@set -eu; \
	dmg_staging="$$(mktemp -d "$(BUILD_DIR)/dmg.XXXXXX")"; \
	trap 'rm -rf "$$dmg_staging"' EXIT; \
	ditto "$(APP)" "$$dmg_staging/Keyboard.app"; \
	ln -s /Applications "$$dmg_staging/Applications"; \
	rm -f "$(DMG)"; \
	hdiutil create \
		-volname "Keyboard" \
		-srcfolder "$$dmg_staging" \
		-ov -format UDZO "$(DMG)" >/dev/null
	@echo "built $(DMG)"

open: app
	open "$(APP)"

stop:
	@pkill -f '\.build/(debug|release)/Keyboard' 2>/dev/null && echo "stopped" || echo "not running"

# Renders the keyboard and the component library to PNGs for comparing against
# the design mocks — no window, no permissions.
snapshots:
	@mkdir -p "$(SNAPSHOT_DIR)"
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-rainbow.png"
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-mono.png" --mono
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/keyboard-light.png" --light
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/component-library.png" --gallery
	swift run Keyboard --snapshot "$(SNAPSHOT_DIR)/tree-viewer.png" --viewer

clean:
	rm -rf .build
