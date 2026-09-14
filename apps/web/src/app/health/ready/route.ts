import { checkReadiness } from "../../../modules/foundation/readiness";

export async function GET() {
  const readiness = await checkReadiness();
  return Response.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
  });
}
