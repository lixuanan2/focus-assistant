# Privacy Policy

Last updated: 2026-05-11

## Summary

Focus Assistant is designed to work primarily with local browser storage. The extension does not require an account and does not intentionally send your browsing data to an external server.

## What data the extension stores

The extension stores the following data in browser local storage:

- blocked domain entries
- group definitions and mode bindings
- schedule windows
- pomodoro duration settings
- blocked-page behavior settings
- current runtime state such as pomodoro phase or temporary bypass expiration

This data is stored only so the extension can apply your focus rules and restore your configuration between browser sessions.

## What permissions are used

- `storage`
  Used to save your settings and runtime state locally.

- `alarms`
  Used to activate schedule and pomodoro transitions at the correct time without a constantly running background loop.

- `tabs`
  Used to redirect a matching tab to the blocked page when a rule becomes active.

- `host_permissions: <all_urls>`
  Used so the extension can determine whether the current URL matches one of your blocking rules.

## What data is not collected

Focus Assistant does not intentionally collect or transmit:

- account information
- email addresses
- payment information
- full browsing history to a remote server
- analytics events to a third-party analytics provider
- advertising identifiers

## Remote services

At the current stage, the extension does not require a backend service to perform its core focus and blocking behavior.

If you choose to configure a custom blocked-page URL, the browser may load that URL as configured by you. Any data handling performed by that destination is outside the control of this extension.

## Data sharing

Focus Assistant does not intentionally sell, rent, or share your local settings data with third parties.

## Data deletion

You can remove stored extension data by:

1. clearing the extension's local storage in the browser
2. removing the extension from the browser
3. overwriting settings through the options page

## Changes to this policy

If the extension later introduces remote sync, analytics, accounts, or payment flows, this policy should be updated before release.
