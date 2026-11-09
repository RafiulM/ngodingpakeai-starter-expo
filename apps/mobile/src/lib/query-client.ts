import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";
import { ApiError } from "@/lib/api/client";
import { refreshSession } from "@/lib/auth-client";

// React Native has no window focus or navigator.onLine. Refetch stale queries
// when the app returns to the foreground, and pause them while offline.
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener("change", (state) =>
    setFocused(state === "active"),
  );
  return () => subscription.remove();
});

onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) =>
    setOnline(state.isConnected !== false),
  );
  return () => subscription.remove();
});

// A 401 means the session ended (signed out elsewhere or revoked): re-read it
// so the root layout sends the user back to sign-in.
function onError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) refreshSession();
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx will not change on retry.
        retry: (failureCount, error) =>
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) && failureCount < 2,
      },
    },
  });
}
