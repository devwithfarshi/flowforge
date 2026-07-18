// Same-origin proxy for the backend's live OpenAPI document. The Scalar page
// (/api-docs) fetches this instead of the backend directly, so the browser never
// makes a cross-origin request and always sees the current spec. Referenced
// literally so Next.js can inline the public base URL.
const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1"
).replace(/\/api\/v\d+\/?$/, "");

export async function GET() {
  try {
    const res = await fetch(`${API_ORIGIN}/swagger/v1/swagger.json`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: `The API returned ${res.status} for its OpenAPI document.`,
        }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
    const spec = await res.text();
    return new Response(spec, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: "Could not reach the API to load its OpenAPI document.",
      }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}
