"use client";

import { useSyncExternalStore } from "react";

import {
  getProviderCredentialSnapshot,
  getServerProviderCredentialSnapshot,
  subscribeToProviderCredentials,
} from "@/lib/providerCredentials";

export function useProviderCredentials() {
  return useSyncExternalStore(
    subscribeToProviderCredentials,
    getProviderCredentialSnapshot,
    getServerProviderCredentialSnapshot
  );
}
