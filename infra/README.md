# Infrastructure (Terraform)

Creates the Cloudflare resources Raito needs. It does **not** deploy the app or
touch data.

Terraform is idempotent, so there is no "create if missing" logic anywhere:
`terraform apply` is a no-op when the remote resource already matches state.
What breaks that guarantee is missing state, so state lives in R2 and CI and a
laptop read the same file.

## Managed here

| Resource | Type |
|---|---|
| `japanese_tutor` | D1 database (`prevent_destroy`) |
| `japanese-tutor-audio` | Private R2 bucket (`prevent_destroy`) |
| `raito` | Pages project, Direct Upload, production branch `main` |
| `<subdomain>` | Pages custom domain + proxied CNAME |
| `Raito` | Access application for the custom domain; `aud` becomes `POLICY_AUD` |
| `Raito pages.dev` | Access application closing `<project>.pages.dev` and previews |

## Not managed here

- **Deploying content.** `wrangler pages deploy` runs from `.github/workflows/deploy.yml`.
- **D1 migrations.** `wrangler d1 migrations apply` runs from the same workflow.
- **First-time Zero Trust activation.** Enabling Zero Trust for the account and choosing the team domain is a one-off dashboard action.

## One-time bootstrap

Terraform cannot store state in a bucket that Terraform has not created yet.
Create the state bucket once, by hand:

```bash
pnpm exec wrangler r2 bucket create raito-tfstate
```

Then create an R2 API token with Object Read & Write on that bucket only. Its
access key and secret become the GitHub secrets `R2_ACCESS_KEY_ID` and
`R2_SECRET_ACCESS_KEY`.

## Running in CI

`.github/workflows/infra.yml`:

- **On a PR touching `infra/`**: `plan` only, with the full plan in the job
  summary. No credentials are used for `fmt`/`validate`, which stay in `ci.yml`.
- **On a push to `main` touching `infra/`**, or manual dispatch: `apply`, behind
  the `production` environment. Add required reviewers under
  Settings → Environments → production so a merge cannot silently rewrite your
  access perimeter.
- `concurrency: terraform` serialises runs. That replaces state locking.

Configure once, before the first run:

| Kind | Name |
|---|---|
| Variable | `CF_ACCOUNT_ID` |
| Variable | `CF_ZONE_ID` |
| Variable | `APP_DOMAIN` |
| Variable | `CF_TEAM_DOMAIN` |
| Variable | `OWNER_EMAIL` |
| Secret | `CLOUDFLARE_API_TOKEN` |
| Secret | `R2_ACCESS_KEY_ID` |
| Secret | `R2_SECRET_ACCESS_KEY` |

Variables, not secrets: none of these five is sensitive, and keeping them
readable makes the plan output comprehensible.

Set them with `gh` once it is authenticated, or through
Settings → Secrets and variables → Actions:

```bash
gh variable set CF_ACCOUNT_ID  --body "<account id>"
gh variable set CF_ZONE_ID     --body "<zone id>"
gh variable set APP_DOMAIN     --body "raito.example.com"
gh variable set CF_TEAM_DOMAIN --body "<team>"
gh variable set OWNER_EMAIL    --body "you@example.com"

gh secret set CLOUDFLARE_API_TOKEN
gh secret set R2_ACCESS_KEY_ID
gh secret set R2_SECRET_ACCESS_KEY
```

The three R2/Cloudflare credentials must be **repository** secrets, not
environment secrets: the `plan` job runs on pull requests and has no
`production` environment, so environment-scoped secrets would gate every PR
behind an approval.

`.env` is not used anywhere in this project. Wrangler reads `.dev.vars`,
Terraform reads `terraform.tfvars` and environment variables, and GitHub
Actions reads `vars.*` and `secrets.*`. A tracked `.env` is rejected by
`pnpm check:secrets`.

After the first `apply`, copy the outputs into `wrangler.toml`:

```bash
terraform -chdir=infra output wrangler_vars
terraform -chdir=infra output d1_database_id
```

`deploy.yml` fails loudly if `wrangler.toml` still contains `REPLACE_WITH`.

## Running locally

CI pins Terraform `1.17.1` and `required_version` enforces `>= 1.17.0`. Use the
same version locally; `brew upgrade terraform` if yours is older.

```bash
cd infra
export CLOUDFLARE_API_TOKEN=...
export AWS_ACCESS_KEY_ID=...            # R2 token, for the state backend
export AWS_SECRET_ACCESS_KEY=...
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars

cat > backend.hcl <<'EOF'
bucket = "raito-tfstate"
key    = "raito/terraform.tfstate"
region = "auto"
use_path_style = true
endpoints = { s3 = "https://<ACCOUNT_ID>.r2.cloudflarestorage.com" }
skip_credentials_validation = true
skip_region_validation      = true
skip_requesting_account_id  = true
skip_s3_checksum            = true
EOF

terraform init -backend-config=backend.hcl
terraform plan
```

`backend.hcl` and `terraform.tfvars` are gitignored. No secret enters state: the
API token comes from the environment and the provider block is empty.

Token permissions: Cloudflare Pages Edit, D1 Edit, Workers R2 Storage Edit,
Access: Apps and Policies Edit, Zone DNS Edit, Zone Read.

## Caveats

- The wildcard `*.pages.dev` Access application is the least certain part. If
  `apply` rejects `destinations`, drop that block and keep `domain`, then cover
  previews by disabling preview deployments in the Pages project.
- Access changes can lock the owner out. Verify the custom domain in a private
  window before depending on it.
- Applying from CI does not verify that Access actually works; that still needs
  a browser.
- Do not create these resources in the dashboard as well. `terraform plan` will
  show the drift, and `prevent_destroy` on D1 and R2 means `destroy` cannot
  delete the learner's progress or the audio.
