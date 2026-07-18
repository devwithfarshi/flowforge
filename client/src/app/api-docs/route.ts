import { ApiReference } from "@scalar/nextjs-api-reference";

// Scalar API reference for the Flowforge REST API. The OpenAPI document is
// loaded dynamically from the same-origin proxy in ./openapi/route.ts, which
// fetches the backend's live spec — so this always reflects the running API and
// any user can open /api-docs to browse it.
export const GET = ApiReference({
  url: "/api-docs/openapi",
});
