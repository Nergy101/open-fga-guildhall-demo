import { define } from "@/utils.ts";
import { logoutCookie } from "@/lib/forumSession.ts";

// Clears the forum session and returns to the login screen.
export const handler = define.handlers({
  GET() {
    return new Response(null, {
      status: 303,
      headers: { location: "/try", "set-cookie": logoutCookie() },
    });
  },
});
