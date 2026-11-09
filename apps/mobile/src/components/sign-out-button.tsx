import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";

// Signing out removes the stored cookie; the root layout then clears cached
// data and sends the user to sign-in.
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onPress={signOut}>
      <Text>Sign out</Text>
    </Button>
  );
}
