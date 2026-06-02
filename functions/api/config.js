export async function onRequestGet({ env }) {
  return jsonResponse({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || ""
  });
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
