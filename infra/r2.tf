resource "cloudflare_r2_bucket" "audio" {
  account_id = var.account_id
  name       = var.r2_bucket_name
  location   = var.r2_location

  # Audio is regenerable, but a destroy is still a multi-hour pipeline run.
  lifecycle {
    prevent_destroy = true
  }
}
