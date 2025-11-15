# Visionary Canvas

Describe it like a human. Get prompts like a director.

Visionary Canvas is a Next.js application that helps creators translate plain-language ideas into production-ready image prompts and cinematic video plans.

## Getting started

### Prerequisites
- Node.js 18+
- pnpm, npm, or yarn

### Installation
```bash
npm install
```

### Running the development server
```bash
npm run dev
```

The app exposes two primary modules:
- `/image` – Vision Architect (image prompt builder)
- `/video` – YouTube Cinematic Director (video scene planner)

## Environment variables

Create a `.env.local` file in the project root containing the environment variables that NextAuth enforces in `src/lib/auth.ts`:

```bash
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
NEXTAUTH_SECRET="a-long-random-string"
```

- **`GOOGLE_CLIENT_ID`** and **`GOOGLE_CLIENT_SECRET`** come from a Google OAuth 2.0 Client ID. In the Google Cloud Console, open **APIs & Services → Credentials**, create (or reuse) an **OAuth client ID** for a Web application, and add `http://localhost:3000/api/auth/callback/google` to the authorized redirect URIs. Copy the generated Client ID and Client Secret into `.env.local`.
- **`NEXTAUTH_SECRET`** secures JWT sessions in production. Generate a value with `openssl rand -base64 32` (or an equivalent random string generator) and add it to `.env.local`.

For more details on configuring Google as an identity provider, refer to the [NextAuth Google provider documentation](https://next-auth.js.org/providers/google).
## Tech stack
- Next.js App Router with TypeScript
- Tailwind CSS for styling
- Director Core (Gemini) orchestration client stub

## Folder structure
```
src/
  app/
    (home)/page.tsx          # Landing page
    image/page.tsx           # Vision Architect UI
    video/page.tsx           # YouTube Cinematic Director UI
    api/
      director/route.ts
  components/
    copy-button.tsx
  lib/
    directorClient.ts
    directorTypes.ts
    prompts/
      directorCore.ts
    visualOptions.ts
```

## Notes
- The `/api/director` endpoint expects a JSON POST body that matches one of the `DirectorRequest` variants and returns `{ "text": string }` from the future Director Core integration.
- The Gemini-based Director Core client is currently a stub and will throw until the service is wired up.
- Initial persistence is in-memory only; future iterations can add database-backed history.
- The image, video, and loop assistant builders accept an optional provider API key input. Keys stay in the browser session and are forwarded with the request via the `x-provider-api-key` header so they are never persisted on the server.
