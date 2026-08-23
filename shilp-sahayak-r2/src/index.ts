import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  STORAGE: R2Bucket;
}

const FIREBASE_PROJECT_ID = "shilp-sahayak";

const FIREBASE_ISSUER =
  `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_EXTENSIONS = [
  ".stl",
  ".obj",
  ".3mf",
];

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
];

function getCorsHeaders(request: Request): Headers {
  const origin = request.headers.get("Origin");

  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

  return new Headers({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods":
      "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-File-Name",
    "Access-Control-Max-Age": "86400",
  });
}

function jsonResponse(
  request: Request,
  data: unknown,
  status = 200
): Response {
  const headers = getCorsHeaders(request);

  headers.set("Content-Type", "application/json");

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers,
    }
  );
}

/**
 * Verify Firebase ID token and return Firebase UID.
 */
async function authenticateUser(
  request: Request
): Promise<string> {
  const authorization =
    request.headers.get("Authorization");

  if (!authorization) {
    throw new Error(
      "Missing Authorization header."
    );
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new Error(
      "Authorization header must use Bearer token."
    );
  }

  const token =
    authorization.substring(7).trim();

  if (!token) {
    throw new Error(
      "Missing Firebase ID token."
    );
  }

  const { payload } = await jwtVerify(
    token,
    FIREBASE_JWKS,
    {
      algorithms: ["RS256"],
      issuer: FIREBASE_ISSUER,
      audience: FIREBASE_PROJECT_ID,
    }
  );

  if (
    typeof payload.sub !== "string" ||
    payload.sub.length === 0
  ) {
    throw new Error(
      "Invalid Firebase UID."
    );
  }

  return payload.sub;
}

function getFileExtension(
  fileName: string
): string {
  const lastDot =
    fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName
    .substring(lastDot)
    .toLowerCase();
}

function sanitizeFileName(
  fileName: string
): string {
  return fileName
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .replace(
      /_+/g,
      "_"
    );
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {

    /*
     * -----------------------------
     * CORS
     * -----------------------------
     */

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers:
          getCorsHeaders(request),
      });
    }

    const url =
      new URL(request.url);

    /*
     * -----------------------------
     * HEALTH CHECK
     * -----------------------------
     */

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return jsonResponse(
        request,
        {
          success: true,
          service:
            "shilp-sahayak-r2",
          storage: "connected",
        }
      );
    }

    /*
     * -----------------------------
     * UPLOAD
     * -----------------------------
     */

    if (
      request.method === "POST" &&
      url.pathname === "/upload"
    ) {
      try {

        /*
         * Verify Firebase token.
         */

        const uid =
          await authenticateUser(
            request
          );

        /*
         * Get file name.
         */

        const fileName =
          request.headers.get(
            "X-File-Name"
          );

        if (!fileName) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "File name is required.",
            },
            400
          );
        }

        /*
         * Validate extension.
         */

        const extension =
          getFileExtension(
            fileName
          );

        if (
          !ALLOWED_EXTENSIONS.includes(
            extension
          )
        ) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "Unsupported file type. Allowed files: STL, OBJ and 3MF.",
            },
            400
          );
        }

        /*
         * Validate file size.
         */

        const contentLength =
          request.headers.get(
            "Content-Length"
          );

        if (
          contentLength &&
          Number(contentLength) >
            MAX_FILE_SIZE
        ) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "File exceeds the 100 MB limit.",
            },
            413
          );
        }

        /*
         * Make sure a body exists.
         */

        if (!request.body) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "No file received.",
            },
            400
          );
        }

        /*
         * Sanitize filename.
         */

        const safeFileName =
          sanitizeFileName(
            fileName
          );

        /*
         * Create unique R2 key.
         *
         * Example:
         *
         * quotes/
         *   firebaseUid/
         *     1750000000000_model.3mf
         */

        const objectKey =
          `quotes/${uid}/${Date.now()}_${safeFileName}`;

        /*
         * Upload directly to R2.
         */

        await env.STORAGE.put(
          objectKey,
          request.body,
          {
            httpMetadata: {
              contentType:
                request.headers.get(
                  "Content-Type"
                ) ||
                "application/octet-stream",
            },

            customMetadata: {
              userId: uid,
              originalFileName:
                fileName,
              uploadedAt:
                new Date().toISOString(),
            },
          }
        );

        /*
         * Success.
         */

        return jsonResponse(
          request,
          {
            success: true,
            key: objectKey,
            fileName,
            size: contentLength
              ? Number(
                  contentLength
                )
              : null,
          }
        );

      } catch (error) {

        console.error(
          "Upload error:",
          error
        );

        return jsonResponse(
          request,
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Authentication or upload failed.",
          },
          401
        );
      }
    }

    /*
     * -----------------------------
     * DELETE FILE
     * -----------------------------
     */

    if (
      request.method === "DELETE" &&
      url.pathname === "/file"
    ) {
      try {

        const uid =
          await authenticateUser(
            request
          );

        const key =
          url.searchParams.get(
            "key"
          );

        if (!key) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "File key is required.",
            },
            400
          );
        }

        /*
         * User can only delete
         * their own files.
         */

        if (
          !key.startsWith(
            `quotes/${uid}/`
          )
        ) {
          return jsonResponse(
            request,
            {
              success: false,
              error:
                "Access denied.",
            },
            403
          );
        }

        await env.STORAGE.delete(
          key
        );

        return jsonResponse(
          request,
          {
            success: true,
          }
        );

      } catch (error) {

        console.error(
          "Delete error:",
          error
        );

        return jsonResponse(
          request,
          {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Authentication or delete failed.",
          },
          401
        );
      }
    }

    /*
     * -----------------------------
     * NOT FOUND
     * -----------------------------
     */

    return jsonResponse(
      request,
      {
        success: false,
        error:
          "Endpoint not found.",
      },
      404
    );
  },
} satisfies ExportedHandler<Env>;