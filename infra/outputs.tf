output "r2_bucket_name" {
  description = "Must equal AUDIO bucket_name in wrangler.toml."
  value       = cloudflare_r2_bucket.audio.name
}

output "pages_project_name" {
  description = "Must equal `name` in wrangler.toml."
  value       = cloudflare_pages_project.app.name
}

output "app_url" {
  description = "The Access-protected hostname."
  value       = "https://${var.domain}"
}

output "access_team_domain" {
  description = "Paste into wrangler.toml as TEAM_DOMAIN."
  value       = local.team_domain_url
}

output "access_aud" {
  description = "Paste into wrangler.toml as POLICY_AUD. This is the custom-domain app's tag."
  value       = cloudflare_zero_trust_access_application.app.aud
}

output "wrangler_vars" {
  description = "The exact block to copy into the [vars] section of wrangler.toml."
  value       = <<-EOT
    TEAM_DOMAIN = "${local.team_domain_url}"
    POLICY_AUD  = "${cloudflare_zero_trust_access_application.app.aud}"
    OWNER_EMAIL = "${var.owner_email}"
  EOT
}
