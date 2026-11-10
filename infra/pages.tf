# Direct Upload project: content is pushed by `wrangler pages deploy` from CI.
# Do not attach a Git source, or every push deploys twice.
resource "cloudflare_pages_project" "app" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = "main"
}

resource "cloudflare_pages_domain" "app" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.app.name
  name         = var.domain
}
