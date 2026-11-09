import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean);

const forbiddenPaths = [
  /(^|\/)\.dev\.vars$/,
  /(^|\/)\.env$/,
  /\.(pem|key)$/
];

const patterns = [
  {
    name: "OpenRouter key",
    test: /sk-or-v1-[A-Za-z0-9_-]{16,}/
  },
  {
    name: "AWS access key",
    test: /AKIA[0-9A-Z]{16}/
  },
  {
    name: "Private key block",
    test: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  },
  {
    name: "Non-empty API key assignment",
    test: /^[ \t]*(?:OPENROUTER_API_KEY|CLOUDFLARE_API_TOKEN|CF_API_TOKEN)[ \t]*=[ \t]*\S+/m
  }
];

const failures = [];

for (const file of tracked) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: forbidden secret-bearing file`);
    continue;
  }

  if (/\.(png|jpg|jpeg|gif|mp3|woff2?)$/i.test(file)) {
    continue;
  }

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  for (const pattern of patterns) {
    if (pattern.test.test(content)) {
      failures.push(`${file}: possible ${pattern.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Secret scan failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed (${tracked.length} tracked files).`);
