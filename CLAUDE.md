# TaskFlow — Claude Code Instructions

## Project Overview

TaskFlow is a high-performance, minimalist Electron desktop application for Windows, providing to-do list management and AI-powered prompt capabilities. Built with React 19 + TypeScript + Vite + Electron.

**Stack:** React 19 · TypeScript · Vite · Electron 40 · electron-builder · electron-updater
**Repo:** https://github.com/s4nby/TaskFlow
**Current version:** see `package.json` → `version`

---

## Confidential Files — Never Touch, Never Expose

The following files are strictly confidential and must **never** be read, logged, committed, pushed, or referenced in any output:

- **`.env`** — contains API keys (`VITE_GROQ_API_KEY`, `VITE_GEMINI_API_KEY`, `CSC_KEY_PASSWORD`) and sensitive configuration
- **`certs/`** — contains `taskflow-signing.pfx`, the Windows code-signing certificate private key

These are already listed in `.gitignore`. Never add them to any git operation (`git add`, `git stash`, etc.). If a command would accidentally stage them, abort and warn the user.

---

## Legal Requirements for Code Modification

- **Backend / Electron layer** (`electron/`) must only be modified when explicitly instructed. Changes to the main process, IPC handlers, auto-updater logic, or build scripts carry security and signing implications — confirm scope with the user before editing.
- Never bypass or remove the Content Security Policy defined in `index.html`.
- Never alter the code-signing pipeline in `scripts/sign-build.cjs` or the `build` section of `package.json` without explicit instruction.
- MIT License (`LICENSE`) must remain intact and unmodified.

---

## Release Process (follow `TaskFlow-Release-SOP.html` exactly)

When the user requests a new version/release, follow these steps in order. Do not skip or reorder them.

### Prerequisites (verify before starting)
- `certs/taskflow-signing.pfx` exists locally
- `.env` has `CSC_KEY_PASSWORD` set
- `gh` CLI is authenticated (`gh auth status`)

### Step 1 — Commit changes
```bash
# Stage only intentionally changed files — never use git add -A
git add <file1> <file2> ...

# Review the diff before committing
git diff --staged

# Commit with a descriptive message
git commit -m "feat: description of what changed"

# Push source
git push
```

### Step 2 — Bump version in `package.json`
Edit `package.json` manually following semantic versioning:
- Bug fix → patch: `1.17.9` → `1.17.10`
- New feature → minor: `1.17.9` → `1.18.0`
- Breaking change → major: `1.17.9` → `2.0.0`

```bash
git add package.json
git commit -m "chore: release vX.X.X - short description"
git push
```

### Step 3 — Build and sign the installer
```bash
npm run electron:build
```

Confirm all three files are present in `dist-electron/` before proceeding:
```
dist-electron/latest.yml
dist-electron/TaskFlow-Setup-X.X.X.exe
dist-electron/TaskFlow-Setup-X.X.X.exe.blockmap
```
If any file is missing, re-run the build. Do not proceed with an incomplete build.

### Step 4 — Publish the GitHub release
```bash
gh release create vX.X.X \
  "dist-electron/TaskFlow-Setup-X.X.X.exe" \
  "dist-electron/TaskFlow-Setup-X.X.X.exe.blockmap" \
  "dist-electron/latest.yml" \
  --title "vX.X.X" \
  --notes "Brief description of what changed."
```

Verify all three assets uploaded:
```bash
gh release view vX.X.X | grep asset
```
Expected: `latest.yml`, `TaskFlow-Setup-X.X.X.exe`, `TaskFlow-Setup-X.X.X.exe.blockmap`

### Release Rules — Never Skip

| Rule | Why |
|------|-----|
| Always include `latest.yml` in the release | Without it, `electron-updater` cannot resolve the download URL and updates silently fail |
| Never commit `.env` or `certs/` | Contains API keys and the signing certificate private key |
| Always run `git diff --staged` before committing | Prevents accidentally staging sensitive or unrelated files |
| Version in `package.json` must match the git tag | A mismatch causes the auto-updater to display incorrect version info |
| One build per release | Never upload assets from an old build to a new tag — hashes in `latest.yml` will not match |

---

## Development Guidelines

### Commands
```bash
npm run dev              # Vite dev server only
npm run electron:dev     # Electron + Vite with HMR
npm run build            # TypeScript compile + Vite build
npm run electron:build   # Full production build + code signing
npm run lint             # ESLint
```

### Project Structure
```
electron/     Main process, IPC, auto-updater (modify with caution)
src/          React frontend — components, views, styles
scripts/      Build utilities (sign-build.cjs)
public/       Static assets
certs/        CONFIDENTIAL — signing certificate
.env          CONFIDENTIAL — API keys and secrets
```

### Code Style
- TypeScript strict mode — no `any` without justification
- React 19 patterns — prefer hooks, avoid class components
- Keep CSP in `index.html` intact; add new external domains only when necessary and with user approval
- Commit messages follow conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
