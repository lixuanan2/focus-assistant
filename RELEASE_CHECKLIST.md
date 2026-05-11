# Release Checklist

## Before tagging

- confirm `manifest.json` version matches the intended release
- run `node --test tests/core-logic.test.mjs`
- manually refresh the extension in Chrome or Edge
- verify icon visibility in the browser toolbar
- verify `Options` page opens and renders all sections

## Manual regression

- toggle manual focus mode on and off
- confirm a permanently blocked group still redirects
- create or edit a schedule window and save settings
- verify an overnight schedule such as `23:00 -> 01:00` is accepted
- start a pomodoro session and confirm the focus phase becomes active
- confirm the blocked page appears for a matching domain
- disable blocked-page bypass in settings and verify the bypass button becomes unavailable
- modify settings, choose to discard changes, and confirm the draft is actually reverted

## Documentation

- update `CHANGELOG.md`
- update `README.md` if behavior changed
- update `PRIVACY.md` if permissions or data flows changed

## GitHub release notes

Suggested structure:

- feature highlights
- user-facing improvements
- fixes and behavior changes
- known limitations

## Browser store prep

- final icon pass for 16px readability
- screenshot set for popup, options, blocked page
- short description
- full description
- permission explanation
- hosted privacy policy URL if required by the target store
