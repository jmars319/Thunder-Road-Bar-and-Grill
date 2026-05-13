# cPanel Deployment Standard

Use extract-overwrite deployments. Do not delete the live site root or `api/` folder before extracting archives.

## Normal Archives

- `frontend-deploy.zip`: extract into the public web root.
- `backend-deploy.zip`: extract into the live `api/` folder.

## Server-Owned Files

Preserve these on the host between deploys:

- `api/.env`
- `api/uploads/`
- `api/incoming/`
- `api/logs/`
- `api/cache/` and other writable runtime folders

Normal deploy zips intentionally exclude secrets, uploaded/incoming media, logs/cache runtime data, source maps, git metadata, tests, local scripts, and dev-only files. TRBG intentionally packages required `vendor/` runtime code for shared hosting.

## Optional Config Restore

Only for first setup or emergency recovery:

```bash
ALLOW_SECRET_CONFIG_ZIP=true npm run deploy:config
```

This creates ignored `server-config-deploy.zip` containing only `.env`. Extract it inside the live `api/` folder. It is secret-bearing. Do not commit, email, or use it as a normal deploy artifact.
