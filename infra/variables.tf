variable "account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "zone_id" {
  description = "Zone ID of the apex domain that hosts the app, e.g. the example.com zone."
  type        = string
}

variable "domain" {
  description = "Hostname for the app, e.g. raito.example.com."
  type        = string
}

variable "team_domain" {
  description = "Zero Trust team name: the <team> in https://<team>.cloudflareaccess.com."
  type        = string
}

variable "owner_email" {
  description = "The only email address allowed through Cloudflare Access."
  type        = string
}

variable "project_name" {
  description = "Cloudflare Pages project name. Must match `name` in wrangler.toml."
  type        = string
  default     = "raito"
}

variable "r2_bucket_name" {
  description = "Private R2 bucket for audio. Must match `bucket_name` in wrangler.toml."
  type        = string
  default     = "japanese-tutor-audio"
}

variable "r2_location" {
  description = "R2 location hint."
  type        = string
  default     = "APAC"
}
