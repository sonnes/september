---
title: Desktop startup and OS identity
description: Start the desktop app with the OS user, automatic onboarding, and last-page restoration.
---

# Desktop startup and OS identity

## Goal

The desktop app starts with a short September screen instead of the web marketing page. A new user enters onboarding automatically. A returning user returns to the last app page.

## Assumptions

- The OS account name initializes the September profile name. The user can edit this name during onboarding.
- The OS account identifier becomes the local account record ID on desktop.
- The browser app keeps its guest or authenticated user identity.
- The app does not restore presentation, display, preview, legal, marketing, or desktop startup routes.
- The app removes OAuth credentials from a route before it stores that route.

## Implementation

1. Add a Rust command that returns the OS account identifier and display name.
2. Use the Rust identity for the desktop account hook.
3. Add a desktop startup route that shows a calm loading screen.
4. Send incomplete accounts to onboarding without user input.
5. Store safe app routes in the Rust settings table.
6. Restore the last safe route after onboarding is complete.

## Completion criteria

- A new desktop account uses the OS identifier and name.
- The first desktop launch starts onboarding automatically.
- A later desktop launch restores the last safe app route.
- The desktop app never stores an OAuth code in the last-route setting.
- The web startup behavior does not change.
