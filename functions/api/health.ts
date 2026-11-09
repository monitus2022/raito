import { HealthResponseSchema } from "../../shared/health";

export const onRequestGet: PagesFunction<Env> = async () => {
  return Response.json(HealthResponseSchema.parse({ ok: true }));
};
