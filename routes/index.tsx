import { define } from "@/utils.ts";

// The app opens on the Legenda — the seeded world at a glance. Send the root
// there; the resource Dashboard lives at /dashboard.
export const handler = define.handlers({
  GET() {
    return new Response(null, {
      status: 307,
      headers: { location: "/legenda" },
    });
  },
});
