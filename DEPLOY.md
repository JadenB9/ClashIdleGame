# Auto-deploy setup

**TL;DR** — Every push to `master` mirrors `public/*` into `JadenB9/j4den@main` at `frontend/public/clashidle/`, which then auto-deploys to Cloudflare Pages (`j4den-cybersec`), which serves `j4den.com/clashidle`.

## How it works

```
ClashIdleGame@master       →  (GitHub Actions mirror)  →  j4den@main
        ↓                                                     ↓
   public/                                        frontend/public/clashidle/
                                                            ↓
                                                  j4den's deploy-frontend.yml
                                                            ↓
                                                  Cloudflare Pages (j4den-cybersec)
                                                            ↓
                                                        j4den.com/clashidle
```

Two GitHub Actions workflows run per push:
1. `ClashIdleGame/.github/workflows/deploy.yml` — rsyncs `public/` (index.html, `css/`, `js/`; not the dev gallery) into the j4den repo and commits to `main`.
2. `j4den/.github/workflows/deploy-frontend.yml` — picks up that commit, runs `cloudflare/pages-action`, Cloudflare Pages rebuilds, edge cache invalidates.

Total time from `git push` → live on `j4den.com/clashidle`: about 60–90 seconds.

## One-time setup (one GitHub secret)

The mirror workflow needs write access to the `JadenB9/j4den` repo. Do this once:

1. **Create a Personal Access Token (classic):**
   - https://github.com/settings/tokens → **Generate new token (classic)**
   - Name: `clashidle-to-j4den-sync`
   - Expiration: No expiration (or 1 year, your call)
   - Scope: check **`repo`** (full control of private repositories)
   - Generate, copy the token.

2. **Add it as a secret in the ClashIdleGame repo:**
   - https://github.com/JadenB9/ClashIdleGame/settings/secrets/actions
   - **New repository secret**
   - Name: `J4DEN_SYNC_TOKEN`
   - Value: the PAT you just copied

That's it. Next push to master auto-deploys.

## Why a PAT and not an SSH deploy key?

Both work. PAT is one less step — you don't need to paste the public key into j4den's deploy keys. If you'd rather use an SSH deploy key, tell me and I'll swap the workflow.

## Why not deploy directly from ClashIdleGame to Cloudflare Pages?

Because j4den.com/clashidle is a sub-path of an existing Cloudflare Pages project (`j4den-cybersec`) that serves the rest of j4den.com. A separate Pages project would deploy to `clashidle.pages.dev` and require custom-domain routing gymnastics. Mirroring into the existing j4den repo is cleaner — one Pages project, one source of truth, zero DNS changes.

## If you don't want automation

You can always manually sync:
```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Projects/j4den
rsync -a --delete --exclude gallery.html ../ClashIdleGame/public/ frontend/public/clashidle/
git add frontend/public/clashidle && git commit -m "clashidle: manual sync" && git push
```
