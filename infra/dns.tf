# Pages does not create this record itself when the domain is attached through
# the API, so it is managed explicitly. ttl = 1 means "automatic".
resource "cloudflare_dns_record" "app" {
  zone_id = var.zone_id
  name    = var.domain
  type    = "CNAME"
  content = "${var.project_name}.pages.dev"
  proxied = true
  ttl     = 1
}
