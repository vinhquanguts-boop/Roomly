# Cloudflare Static Deployment

Roomly's `workers.dev` deployment is a public static site. The full workspace remains local because it requires this computer's Docker PostgreSQL, Redis, local file storage, and Ollama services.

## Cloudflare Git Settings

Use these values for the `vinhquanguts-boop/Roomly` repository:

| Setting | Value |
| --- | --- |
| Root directory | `/` |
| Node.js version | `22` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:cloudflare` |

`wrangler.toml` is the source of truth for the Worker name, `build/` assets directory, and SPA fallback. Do not enter a separate assets directory in the Cloudflare dashboard.

## Deployment Checks

Run the same commands locally before committing:

```powershell
cd E:\Roomly
npm ci
npm run lint
npm run build
npm run deploy:cloudflare:dry-run
```

The production build reads `.env.production`, which sets `VITE_DEPLOYMENT_MODE=static`. It intentionally has no API URL, credentials, or local service settings.

## Public and Local Routes

The public site serves `/`, `/pricing`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml`.

Workspace routes such as `/design/upload`, `/auth/sign-in`, `/dashboard`, `/account`, `/chat`, and `/explore` render an explanation that the Roomly workspace runs locally. They do not make API or authentication requests from `workers.dev`.

## Deployment Diagnostic Record

On 13 July 2026, `npm run deploy:cloudflare` completed the asset validation but stopped before upload because the non-interactive terminal did not have `CLOUDFLARE_API_TOKEN`. This is an account-authentication requirement, not a source-build failure.

For Git deployment, push the verified changes and let the Cloudflare Git integration use the settings above. For a manual deployment, run `npx wrangler login` from an interactive terminal or configure a Cloudflare API token outside the repository. Never add that token to `.env.production`, `.env.local`, source files, or Git.

This repository pins `wrangler@4.110.0`, declares Node 22 through `.node-version` and `package.json`, and deploys with `wrangler deploy`; these changes remove dependency-version and asset-directory ambiguity.
