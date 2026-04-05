# Auto-deploy setup

Every `git push` to `master` will redeploy the contents of `public/` to Cloudflare Pages under a project called **`clashidle`**.

## One-time setup (takes ~3 minutes)

### 1. Create a Cloudflare API token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token** → use the **Edit Cloudflare Workers** template (it includes Pages permissions), OR create a custom token with:
   - **Account** → **Cloudflare Pages** → **Edit**
3. Copy the token.

### 2. Get your Account ID

1. Open any page under https://dash.cloudflare.com — your Account ID is in the right sidebar (long hex string).

### 3. Add both as GitHub repository secrets

At https://github.com/JadenB9/ClashIdleGame/settings/secrets/actions click **New repository secret** twice:

- Name: `CLOUDFLARE_API_TOKEN` — value: the token from step 1
- Name: `CLOUDFLARE_ACCOUNT_ID` — value: the ID from step 2

### 4. Create the Cloudflare Pages project

The first `wrangler pages deploy` will create the project automatically if it doesn't exist, so you can just push and watch the Action run.

If you'd rather pre-create it: https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Create a project** → give it the name `clashidle`. No git connection needed — the Action handles uploads.

### 5. Point `j4den.com/clashidle` at the Pages deployment

Your Pages project will be live at `https://clashidle.pages.dev` immediately. To serve it under `j4den.com/clashidle`, you have two options:

**Option A — Custom domain on Pages (recommended):**
1. In your Pages project → **Custom domains** → **Set up a custom domain** → `clashidle.j4den.com`
2. DNS auto-updates if `j4den.com` is already on Cloudflare.

**Option B — Keep the `/clashidle` sub-path:**
Use a Cloudflare Worker or Page Rule to rewrite `j4den.com/clashidle/*` → `clashidle.pages.dev/*`.

## After setup

Every push to `master` now auto-deploys. You'll see the run at
https://github.com/JadenB9/ClashIdleGame/actions

No more `REVALIDATED` stale-cache surprises — the `_headers` file tells Cloudflare to revalidate HTML/JS/CSS on every request.

## If you're NOT using Cloudflare Pages

Tell me which host you're actually on (VPS via SSH, Netlify, Vercel, custom Node server, etc.) and I'll swap the workflow to target that instead.
