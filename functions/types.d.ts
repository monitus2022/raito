interface Env {
  DB: D1Database;
  AUDIO: R2Bucket;
  TEAM_DOMAIN: string;
  POLICY_AUD: string;
  OWNER_EMAIL: string;
  DEV_BYPASS_ACCESS?: string;
}
