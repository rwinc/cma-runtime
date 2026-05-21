# jose (JWT) + Vite 8 — Correct Patterns

> TRIGGER: code imports from `jose` or configures `vite.config.ts`.
> Richwood baseline: jose ^6.0.0 | vite ^8.0.0

---

## jose v6 — JWT Operations

### JWT Verification (Most Common in Richwood)

```ts
import { jwtVerify } from "jose";

// Verify with direct key
const { payload, protectedHeader } = await jwtVerify(
  token, // string (the JWT)
  secretKey, // Uint8Array | CryptoKey
  {
    issuer: "https://login.microsoftonline.com/{tenant}/v2.0",
    audience: "your-audience-tag",
  },
);
// payload is typed as JWTPayload
```

### JWKS (Cloudflare Access Pattern)

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

// Create JWKS client (caches keys automatically)
const JWKS = createRemoteJWKSet(
  new URL("https://<team>.cloudflareaccess.com/cdn-cgi/access/certs"),
);

// Verify using JWKS
const { payload } = await jwtVerify(token, JWKS, {
  issuer: "https://<team>.cloudflareaccess.com",
  audience: "<application-audience-tag>",
});
```

### JWT Signing

```ts
import { SignJWT } from "jose";

const secret = new TextEncoder().encode("your-secret-key");

const jwt = await new SignJWT({ sub: userId, role: "admin" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .setIssuer("richwood-api")
  .setAudience("richwood-app")
  .sign(secret);
```

### Key Import

```ts
import { importSPKI, importPKCS8, importJWK } from "jose";

// v6 returns CryptoKey (not KeyObject)
const publicKey = await importSPKI(pem, "RS256");
const privateKey = await importPKCS8(pem, "RS256");
const key = await importJWK(jwk, "RS256");
```

### WRONG Patterns

```ts
// WRONG — jsonwebtoken package (not in Richwood stack)
import jwt from "jsonwebtoken";
jwt.verify(token, secret);

// WRONG — jose v4 KeyObject returns (v6 returns CryptoKey)
const key: KeyObject = await importSPKI(pem, "RS256"); // Now CryptoKey

// WRONG — manual fetch for JWKS (jose handles this)
const response = await fetch(jwksUri);
const keys = await response.json();
```

### Token Comparison (Security)

```ts
// CORRECT — timing-safe comparison for token validation
const encoder = new TextEncoder();
const a = encoder.encode(providedToken);
const b = encoder.encode(expectedToken);

if (a.byteLength !== b.byteLength) return false;
return crypto.subtle.timingSafeEqual(a, b);

// WRONG — direct string comparison (timing attack vulnerable)
if (providedToken === expectedToken) {
}
```

---

## Vite 7 — Configuration

### Standard Richwood Config

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    target: "es2022",
  },
});
```

### Breaking Changes from Vite 6

**Node.js requirement:** Minimum Node.js 20.19+ or 22.12+ (dropped Node 18).

**Sass:** Legacy API removed. Remove `css.preprocessorOptions.sass.api` / `css.preprocessorOptions.scss.api` if present.

**splitVendorChunkPlugin:** Removed. Use `build.rollupOptions.output.manualChunks` if you need vendor splitting.

**Private class fields:** Now output as native `#field` syntax.

### Proxy Config (Dev Server)

```ts
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787", // Wrangler dev server
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Variables

```ts
// .env files loaded automatically
// Access in client code (must be prefixed with VITE_)
const apiUrl = import.meta.env.VITE_API_URL;

// WRONG — process.env in Vite client code
const apiUrl = process.env.REACT_APP_API_URL; // This is CRA, not Vite
```

### WRONG Patterns

```ts
// WRONG — webpack config
module.exports = { entry: "./src/index.tsx" };

// WRONG — CRA environment variables
process.env.REACT_APP_FOO;

// WRONG — old Tailwind integration
// postcss.config.js with tailwindcss plugin (use @tailwindcss/vite instead)
```

---

## Need More Detail?

For full API reference, use: `/stack-docs jose <topic>` or `/stack-docs vite <topic>`
