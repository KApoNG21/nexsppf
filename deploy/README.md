# NEXS PPF production deploy

Production domain: `https://nexsppf.com`

The production site is a Dockerized Next.js application with PostgreSQL and private
file storage on the existing VPS. Cloudflare is used only as DNS/proxy; the
application itself runs on the VPS.

## Manual deploy on VPS

Run on the production VPS only:

```bash
cd /docker/nexsppf-web/repo
git status --short --branch
bash deploy/host-deploy-nexsppf.sh
```

The deploy script never rewrites source files. It saves the current image,
database dump, private uploaded files, and release metadata before the switch.

## Verify after deploy

```bash
for url in \
  "https://nexsppf.com/" \
  "https://nexsppf.com/products" \
  "https://nexsppf.com/warranty" \
  "https://nexsppf.com/r/PRO-1196MXY0401178Q" \
  "https://nexsppf.com/about-nexs" \
  "https://nexsppf.com/clear-ppf" \
  "https://nexsppf.com/compare" \
  "https://nexsppf.com/faq" \
  "https://www.nexsppf.com/" \
  "https://russia.nexsppf.com/" \
  "https://usa.nexsppf.com/"; do
  echo "-- $url --"
  curl -fsSI -L --max-time 30 -A 'Mozilla/5.0' "$url" | sed -n '1,20p'
done
```

Expected: every route above returns `HTTP/2 200` or `HTTP/1.1 200` through Cloudflare/Traefik.

`www`, `russia`, and `usa` are aliases that serve the same site as the apex `nexsppf.com`
(same Traefik router/service). They are not separate apps. If `russia.`/`usa.` return
`404`, the Traefik router rule on the VPS is missing those hosts — re-run
`deploy/host-deploy-nexsppf.sh` so the dynamic config is rewritten.

## Self-hosted runner requirement

For automatic deployment, register and run a GitHub Actions self-hosted runner for `KApoNG21/nexsppf` on the VPS. The runner must be online and allowed to run jobs labeled `self-hosted`.

Check in GitHub UI:

`https://github.com/KApoNG21/nexsppf/settings/actions/runners`
