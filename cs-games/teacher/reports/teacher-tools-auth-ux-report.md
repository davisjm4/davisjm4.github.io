# Repeated teacher sign-in: investigation and proposed approach

## Finding

Teacher Tools and the Pathway editor each load Google Identity Services and call `google.accounts.id.initialize` themselves
(`wpr-online.mjs` and `pacing/app.mjs`). The returned Google ID token is held only in a JavaScript variable on that page. Navigating between
the two pages, or reloading, drops it, so the teacher signs in again. The Worker verifies the ID token on every request, so there is no server session to
reuse. The ID token is also short-lived (about an hour).

This is by design a conservative setup: nothing sensitive is persisted. Persisting the raw token in `localStorage` would remove the
repeated prompt but exposes a bearer token to any script on the origin (XSS), so I did not do that.

## What the redesign does now

- Both pages say plainly that they sign in separately ("Teacher Tools and this editor sign in separately for now").
- A "Signed in as teacher" chip and a "Sign in again" button make the state visible.
- Navigation between views inside Teacher Tools is a single page, so moving between My Classes, Practice and Pathways no longer signs out.
  Only the hop to the pathway editor does.
- The editor works locally without sign-in and keeps the plan in the browser, so sign-in is only needed to save shared drafts and publish.

## Recommended approach (needs review before building)

Preferred: a small **frontend session module** (for example `cs-games/teacher/session.mjs`) shared by both pages, so Google Sign-In is initialized in one place with one consistent UI. Because the token lives in memory, a module alone cannot carry a sign-in across a page load, so pair it with one of these options:

1. **Worker session exchange (best).** `POST /teacher/session` verifies the ID token once and sets a short-lived, `HttpOnly; Secure; SameSite=Lax` cookie
   (or returns an opaque session id). Pages then call the API with `credentials: 'include'`. Requires the Worker, CORS and cookie-domain work, which
   is outside this frontend patch. Cookies are only shared with the Worker if it is served from the same site (for example a custom domain such as
   `api.<site-domain>`); on a `workers.dev` domain this is a third-party cookie and may be blocked.
2. **Google One Tap / `auto_select` re-prompt.** Cheapest and secure: on page load, call `google.accounts.id.prompt()` with `auto_select: true`
   in the shared module so a returning teacher is signed in with one click or none. It is subject to browser cooldowns and cannot be relied on alone.
3. **`sessionStorage` handoff of the ID token for the tab only.** Reduces prompts within one tab but is still script-readable. Not recommended
   unless the team accepts that risk.

Suggested order: ship the shared module with option 2 first (frontend only, no new secrets), then option 1 when the Worker can be changed.

## Not changed

No token storage, verification or authorization behavior was modified in this patch.
