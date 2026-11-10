# Authentication comes from CLOUDFLARE_API_TOKEN in the environment. The
# provider does not reuse `wrangler login` credentials. Never put a token in
# this file, in a .tfvars file, or in the state.
provider "cloudflare" {}
