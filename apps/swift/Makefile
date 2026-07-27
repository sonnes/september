# September — macOS app
#
# Accessibility permission is granted to a (bundle id, code signature) pair.
# Signing ad-hoc mints a new signature on every build, which revokes the
# permission each time, so `make app` prefers a stable self-signed identity.
# Create one once (Keychain Access ▸ Certificate Assistant ▸ Create a
# Certificate…, name "September Dev", type "Code Signing"), then rebuilds keep
# their permission. See README.md.

CONFIG ?= release
BUILD_DIR := .build/$(CONFIG)
APP := $(BUILD_DIR)/September.app
IDENTITY ?= $(shell security find-identity -v -p codesigning 2>/dev/null | grep -o '"September Dev"' | head -1 | tr -d '"')

.PHONY: run test app open clean

# Runs unbundled: the terminal's own Accessibility permission is used.
run:
	swift run September

test:
	swift run KitTests

app:
	swift build -c $(CONFIG)
	rm -rf "$(APP)"
	mkdir -p "$(APP)/Contents/MacOS" "$(APP)/Contents/Resources"
	cp "$(BUILD_DIR)/September" "$(APP)/Contents/MacOS/September"
	cp Resources/Info.plist "$(APP)/Contents/Info.plist"
	cp -R "$(BUILD_DIR)/September_SeptemberKit.bundle" "$(APP)/Contents/Resources/"
	codesign --force --options runtime --timestamp=none \
		--entitlements Resources/September.entitlements \
		--sign "$(if $(IDENTITY),$(IDENTITY),-)" "$(APP)"
	@if [ -z "$(IDENTITY)" ]; then \
		echo "warning: signed ad-hoc — Accessibility permission will reset on the next build."; \
		echo "         create a 'September Dev' code-signing certificate to keep it."; \
	fi
	@echo "built $(APP)"

open: app
	open "$(APP)"

clean:
	rm -rf .build
