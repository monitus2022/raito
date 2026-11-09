import { createRemoteJWKSet, jwtVerify } from "jose";

const PUBLIC_PATHS = new Set(["/api/health"]);

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);

  if (PUBLIC_PATHS.has(url.pathname)) {
    return context.next();
  }

  // Local development only. Never set this in production.
  if (context.env.DEV_BYPASS_ACCESS === "true") {
    return context.next();
  }

  const token = context.request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const teamDomain = context.env.TEAM_DOMAIN;
  const audience = context.env.POLICY_AUD;

  if (!teamDomain || !audience) {
    return new Response("Access is not configured", { status: 500 });
  }

  try {
    const jwks = createRemoteJWKSet(
      new URL(`${teamDomain}/cdn-cgi/access/certs`)
    );
    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
      audience
    });

    const owner = context.env.OWNER_EMAIL?.toLowerCase();
    const email =
      typeof payload.email === "string" ? payload.email.toLowerCase() : null;

    if (!owner || email !== owner) {
      return new Response("Forbidden", { status: 403 });
    }

    return context.next();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
};
