# Infrastructure (Terraform)

Creates the Cloudflare resources Raito needs. It does **not** deploy the app or
touch data.

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
- **GitHub Actions secrets.** Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in repo settings.
- **First-time Zero Trust activation.** Enabling Zero Trust for the account and choosing the team domain is a one-off dashboard action.

## Usage

```bash
cd infra
export CLOUDFLARE_API_TOKEN=...        # never commit this
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars

terraform init
terraform plan
terraform apply
terraform output wrangler_vars          # copy into wrangler.toml [vars]
terraform output d1_database_id         # copy into wrangler.toml d1_databases
```

Token permissions: Cloudflare Pages Edit, D1 Edit, Workers R2 Storage Edit,
Access: Apps and Policies Edit, Zone DNS Edit, Zone Read.

## State

State is local (`terraform.tfstate`, gitignored) because no secret is stored in
it: the API token comes from the environment and the provider config holds no
credentials. If this machine is lost, `terraform import` recovers each resource:

```bash
terraform import cloudflare_d1_database.state <account_id>/<database_id>
terraform import cloudflare_r2_bucket.audio <account_id>/<bucket_name>
terraform import cloudflare_pages_project.app <account_id>/<project_name>
```

## Drift

Do not create these resources in the dashboard and in Terraform. Pick one path.
`terraform plan` after any dashboard change will show the difference.

`prevent_destroy` on D1 and R2 means `terraform destroy` cannot delete the
learner's progress or the audio. Remove the lifecycle block deliberately if you
ever actually want to.

## Caveats

- The wildcard `*.pages.dev` Access application is the least certain part. If
  `apply` rejects `destinations`, drop that block and keep `domain`, then cover
  previews by disabling preview deployments in the Pages project.
- Access application changes can lock the owner out. Verify the custom domain in
  a private window before merging a deploy that depends on it.
