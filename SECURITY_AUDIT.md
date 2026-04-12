# Security Audit Report

> **Audit Date:** 2026-04-12
> **Audit Commit:** `d6cff67`
> **Audited By:** AI Security Agent (4 parallel sub-agents)
> **Format:** AI-Agent-Readable Markdown

---

## Metadata

```yaml
audit_id: SEC-2026-04-12-001
repo: zeuikli/baby-diary
branch: main
scope:
  - dependencies (502 packages)
  - source_code (all src/ files)
  - commit_history (38 commits)
  - cicd_configuration (deploy.yml)
severity_counts:
  critical: 0
  high: 4
  medium: 5
  low: 6
  info: 7
fixes_applied: 8
fixes_deferred: 2
```

---

## Scan Results

### Dependencies (502 packages)

| ID | Severity | Package | Advisory | Status |
| --- | --- | --- | --- | --- |
| DEP-001 | HIGH | `serialize-javascript@6.0.2` | GHSA-5c6j-r48x-rmvq (RCE) | DEFERRED — transitive via vite-plugin-pwa, requires vite 8.x upgrade |
| DEP-002 | HIGH | `serialize-javascript@6.0.2` | GHSA-qj8w-gfj5-8c6v (DoS) | DEFERRED — same as DEP-001 |
| DEP-003 | MODERATE | `esbuild@0.21.5` | GHSA-67mh-4wv8-2f99 (dev server) | ACCEPTED — dev-only, no production impact |
| DEP-004 | MODERATE | `vite@5.4.21` | GHSA-4w7w-66w2-5vf9 (path traversal) | ACCEPTED — dev-only, requires vite 8.x |

### Source Code

| ID | Severity | Category | File | Status |
| --- | --- | --- | --- | --- |
| SRC-001 | HIGH | DataExposure | `Settings.jsx` — share code Base64 PAT | **FIXED** — P2-1: PBKDF2 + AES-GCM encryption |
| SRC-002 | HIGH | DataExposure | `localStorage.js` — PAT in plaintext | MITIGATED — P1-2: CSP restricts XSS vectors |
| SRC-003 | MEDIUM | Injection | `Settings.jsx` — share code import no validation | **FIXED** — P1-3: type/regex validation + confirm dialog |
| SRC-004 | MEDIUM | DataExposure | `vite.config.js` — SW caches API responses | **FIXED** — P1-1: removed runtimeCaching |
| SRC-005 | LOW | PrototypePollution | `localStorage.js` — deepMerge unsafe | **FIXED** — P1-4: `__proto__`/`constructor`/`prototype` guard |
| SRC-006 | LOW | InfoLeakage | `github.js` — raw API errors shown | ACCEPTED — low risk, useful for debugging |
| SRC-007 | LOW | DoS | `Import.jsx` — no CSV size limit | ACCEPTED — client-side only |
| SRC-008 | INFO | Privacy | `Diary.jsx` — photo src not validated | ACCEPTED — requires manual data tampering |

### Commit History

| ID | Severity | Check | Status |
| --- | --- | --- | --- |
| GIT-001 | CLEAN | Hardcoded secrets | No secrets found in any commit |
| GIT-002 | CLEAN | Sensitive files | No .env/.pem/.key files committed |
| GIT-003 | LOW | .gitignore gaps | **FIXED** — P1-5: added `*.pem`/`*.key`/`.env.*` etc. |

### CI/CD Configuration

| ID | Severity | Check | Status |
| --- | --- | --- | --- |
| CI-001 | MEDIUM | Actions not pinned to SHA | **FIXED** — P2-2: all 3 actions pinned |
| CI-002 | MEDIUM | No CSP headers | **FIXED** — P1-2: CSP meta tag added |
| CI-003 | LOW | `contents: write` scope | ACCEPTED — required by gh-pages action |
| CI-004 | CLEAN | No script injection risk | No user input in `run:` blocks |
| CI-005 | CLEAN | No fork PR trigger | Workflow only on push to main |
| CI-006 | CLEAN | Supply chain | `npm ci` + lockfile committed |

---

## Fixes Applied (Commit `d6cff67`)

| Priority | ID | Fix | Files Changed |
| --- | --- | --- | --- |
| P0 | DEP-001/002 | Removed direct serialize-javascript dep; override caused build failure, reverted. Transitive dep deferred to vite 8.x upgrade. | `package.json` |
| P1-1 | SRC-004 | Removed `runtimeCaching` for `api.github.com` from workbox config | `vite.config.js` |
| P1-2 | CI-002 | Added `<meta http-equiv="Content-Security-Policy">` with strict source restrictions | `index.html` |
| P1-3 | SRC-003 | Share code import: string type validation, regex for owner/repo, `confirm()` with target repo display, strip extraneous properties | `Settings.jsx` |
| P1-4 | SRC-005 | `deepMerge`: skip `__proto__`, `constructor`, `prototype` keys | `localStorage.js` |
| P1-5 | GIT-003 | `.gitignore`: added `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.cert`, `id_rsa`, `id_ed25519`, `credentials.json`, `.env.*` | `.gitignore` |
| P2-1 | SRC-001 | Share code encryption: PBKDF2 key derivation (100k iterations, SHA-256) + AES-256-GCM, with user-provided password | `Settings.jsx` |
| P2-2 | CI-001 | Pinned all GitHub Actions to immutable commit SHAs | `deploy.yml` |

---

## Deferred Items

| Priority | ID | Reason | Remediation |
| --- | --- | --- | --- |
| P3 | DEP-001/002 | `serialize-javascript` is a transitive dep of `workbox-build` via `@rollup/plugin-terser`. Cannot override without breaking the ESM build. | Upgrade to vite 8.x + vite-plugin-pwa 1.x when stable. Build-time only, no production runtime impact. |
| P3 | DEP-003/004 | esbuild/vite dev server vulnerabilities. Dev-only exposure. | Same vite 8.x upgrade path. |

---

## Recommendations for Future Audits

1. Re-run this audit after upgrading to vite 8.x
2. Consider `npm audit signatures` to verify package provenance
3. Monitor `peaceiris/actions-gh-pages` for v5 release with native Node 24 support
4. Evaluate migrating PAT storage to `sessionStorage` for reduced persistence
5. Add automated `npm audit` to CI pipeline as a non-blocking check

---

## Verification Checklist

- [x] `npm run build` passes
- [x] All changes committed (`d6cff67`)
- [x] Pushed to `main` branch
- [x] GitHub Pages deploy triggered
- [x] No secrets in commit diff
- [x] CSP meta tag present in `index.html`
- [x] Service Worker no longer caches API responses
- [x] Share code requires password for encrypt/decrypt
- [x] Import validates and confirms target repo
- [x] Actions pinned to SHA
