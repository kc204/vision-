import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function refreshGoogleAccessToken(token: GoogleTokenPayload) {
  const refreshToken = token.refreshToken;
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const message = typeof data.error_description === "string"
      ? data.error_description
      : typeof data.error === "string"
        ? data.error
        : "Failed to refresh Google access token.";
    throw new Error(message);
  }

  const accessToken = typeof data.access_token === "string" ? data.access_token : null;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : null;
  const newRefreshToken =
    typeof data.refresh_token === "string" ? data.refresh_token : refreshToken;

  if (!accessToken) {
    throw new Error("Google token refresh response missing access_token");
  }

  const now = Date.now();
  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt: expiresIn ? now + expiresIn * 1000 : null,
  } satisfies Pick<GoogleTokenPayload, "accessToken" | "refreshToken" | "expiresAt">;
}

type GoogleTokenPayload = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number | null;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/generative-language",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      const payload: GoogleTokenPayload = {
        accessToken: typeof token.accessToken === "string" ? token.accessToken : undefined,
        refreshToken: typeof token.refreshToken === "string" ? token.refreshToken : undefined,
        expiresAt: typeof token.expiresAt === "number" ? token.expiresAt : null,
      };

      if (account && account.provider === "google") {
        payload.accessToken = account.access_token ?? payload.accessToken;
        payload.refreshToken = account.refresh_token ?? payload.refreshToken;
        payload.expiresAt = account.expires_at
          ? account.expires_at * 1000
          : account.expires_in
            ? Date.now() + account.expires_in * 1000
            : payload.expiresAt ?? null;
      }

      const shouldRefresh =
        typeof payload.expiresAt === "number" ? payload.expiresAt - Date.now() < 60_000 : false;

      if (shouldRefresh && payload.refreshToken) {
        try {
          const refreshed = await refreshGoogleAccessToken(payload);
          payload.accessToken = refreshed.accessToken;
          payload.refreshToken = refreshed.refreshToken;
          payload.expiresAt = refreshed.expiresAt;
        } catch (error) {
          console.warn("Failed to refresh Google access token", error);
        }
      }

      token.accessToken = payload.accessToken;
      token.refreshToken = payload.refreshToken;
      token.expiresAt = payload.expiresAt ?? null;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? null;
      }

      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.accessTokenExpires = typeof token.expiresAt === "number" ? token.expiresAt : null;
      session.providerTokens = session.accessToken
        ? {
            google: {
              accessToken: session.accessToken,
              expiresAt: session.accessTokenExpires ?? null,
            },
          }
        : {};

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export const auth = () => getServerSession(authOptions);
export { handler as handlers };
