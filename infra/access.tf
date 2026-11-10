# Single-user gate. No identity provider is required: Cloudflare's built-in
# one-time PIN is used, and the policy allows exactly one email address.
resource "cloudflare_zero_trust_access_policy" "owner" {
  account_id = var.account_id
  name       = "Owner only"
  decision   = "allow"

  include = [{
    email = {
      email = var.owner_email
    }
  }]
}

# The application whose AUD goes into wrangler.toml as POLICY_AUD.
resource "cloudflare_zero_trust_access_application" "app" {
  account_id       = var.account_id
  name             = "Raito"
  domain           = var.domain
  type             = "self_hosted"
  session_duration = "24h"

  policies = [{
    id         = cloudflare_zero_trust_access_policy.owner.id
    precedence = 1
  }]
}

# Without this, <project>.pages.dev and every preview URL bypass Access and
# serve the app publicly.
resource "cloudflare_zero_trust_access_application" "pages_dev" {
  account_id = var.account_id
  name       = "Raito pages.dev"
  domain     = "${var.project_name}.pages.dev"
  type       = "self_hosted"
  destinations = [
    { type = "public", uri = "${var.project_name}.pages.dev" },
    { type = "public", uri = "*.${var.project_name}.pages.dev" },
  ]
  session_duration = "24h"

  policies = [{
    id         = cloudflare_zero_trust_access_policy.owner.id
    precedence = 1
  }]
}
