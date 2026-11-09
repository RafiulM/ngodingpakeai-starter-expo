import "@/global.css";

import { useEffect, useState } from "react";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { roleHasPermission } from "@starter/shared/permissions";
import { siteConfig } from "@starter/shared/site";
import { authClient } from "@/lib/auth-client";
import { createQueryClient } from "@/lib/query-client";
import { NAV_THEME } from "@/lib/theme";

// Keep the splash screen up until the stored session has been read.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [queryClient] = useState(createQueryClient);
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (!isPending) SplashScreen.hide();
  }, [isPending]);

  // Cached data belongs to one account. Drop it whenever the account changes,
  // including sign-out, so the next person never sees it.
  useEffect(() => {
    queryClient.clear();
  }, [userId, queryClient]);

  const signedIn = Boolean(session);
  // Hiding a screen is presentation only: the admin API checks every request.
  const isAdmin = roleHasPermission(session?.user.role, {
    notes: ["read-any"],
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        value={NAV_THEME[colorScheme === "dark" ? "dark" : "light"]}
      >
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack>
          <Stack.Protected guard={signedIn} redirectTo="/sign-in">
            <Stack.Screen name="index" options={{ title: siteConfig.name }} />
            <Stack.Screen name="notes" options={{ title: "Notes" }} />
            <Stack.Protected guard={isAdmin} redirectTo="/">
              <Stack.Screen name="admin" options={{ title: "Admin" }} />
            </Stack.Protected>
          </Stack.Protected>
          <Stack.Protected guard={!signedIn} redirectTo="/">
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
