# Authentication comes from CLOUDFLARE_API_TOKEN in the environment, or from
# `wrangler login` if the provider can reuse that config. Never put a token in
# this file, in a .tfvars file, or in the state.
provider "cloudflare" {}
