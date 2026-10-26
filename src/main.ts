import { serve } from "bun";

serve({
  port: 3000,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("Hello from Bun API!", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  },
});
