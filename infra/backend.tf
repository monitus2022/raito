# Remote state in R2 so CI and a laptop operate on the same resources.
#
# The configuration block is intentionally empty: the S3 endpoint embeds the
# account ID, so it is supplied at init time with -backend-config. See
# infra/README.md for the exact file CI generates.
terraform {
  backend "s3" {}
}
