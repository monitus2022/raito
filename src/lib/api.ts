import {
  HealthResponseSchema,
  type HealthResponse
} from "../../shared/health";

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error(`Health check failed with ${response.status}`);
  }

  return HealthResponseSchema.parse(await response.json());
}
