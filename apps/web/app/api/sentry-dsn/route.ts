import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(env.SENTRY_DSN ?? "", {
    headers: { "Cache-Control": "no-store" },
  });
}
