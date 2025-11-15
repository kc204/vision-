import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & { id?: string | null };
    accessToken?: string;
    accessTokenExpires?: number | null;
    providerTokens?: {
      google?: {
        accessToken: string;
        expiresAt: number | null;
      };
      nanoBanana?: {
        apiKey: string;
      };
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number | null;
    providerTokens?: {
      nanoBanana?: {
        apiKey: string;
      };
    };
  }
}
