resource "cloudflare_d1_database" "state" {
  account_id = var.account_id
  name       = var.d1_database_name

  # Replacing this resource deletes every review state and attempt. A rename or
  # a tainted resource would wipe the learner's progress, so refuse it.
  lifecycle {
    prevent_destroy = true
  }
}
