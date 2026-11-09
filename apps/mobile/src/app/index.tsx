// STARTER PLACEHOLDER. Replace this screen with your app's first screen. The
// testID="starter-placeholder" below lets `pnpm run doctor` remind you while
// it is still here; delete apps/mobile/.maestro/starter.yaml along with it.
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Check, NotebookPen, Plus, ShieldCheck } from "lucide-react-native";
import { roleHasPermission } from "@starter/shared/permissions";
import { CopyPrompt } from "@/components/copy-prompt";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";

const prompt =
  "Read AGENTS.md and use the build-feature skill. Replace the starter home screen with [describe your first feature]. Add the API route and service in apps/api, the shared validator in packages/shared, and the data hooks and screen in apps/mobile like the Notes example. Keep authentication working and use Context7 to check library APIs.";

export default function HomeScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  if (!session) return null;
  const { user } = session;
  // Hiding the button is presentation only. The admin screen and API guard
  // themselves.
  const isAdmin = roleHasPermission(user.role, { notes: ["read-any"] });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 p-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ headerRight: () => <SignOutButton /> }} />
      <View className="gap-3">
        <View className="flex-row items-center gap-1.5">
          <Icon as={Check} size={16} className="text-primary" />
          <Text className="text-sm font-medium text-primary">
            You’re signed in
          </Text>
        </View>
        <Text className="text-3xl font-semibold tracking-tight">
          Welcome, {user.name}.
        </Text>
        <Text className="text-lg leading-7 text-muted-foreground">
          This is your app. Let’s give it something to do.
        </Text>
      </View>
      <View
        testID="starter-placeholder"
        className="gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-8"
      >
        <View className="size-12 items-center justify-center rounded-xl border border-border bg-muted">
          <Icon as={Plus} size={20} className="text-muted-foreground" />
        </View>
        <Text className="text-xl font-semibold tracking-tight">
          Your first feature starts here
        </Text>
        <Text className="text-base leading-7 text-muted-foreground">
          A reading list? A space for project ideas? Tell your AI editor what
          you need, and build from this blank canvas. The Notes example shows
          the full path from Express route to React Native screen.
        </Text>
        <Button
          variant="outline"
          className="self-start"
          onPress={() => router.push("/notes")}
        >
          <Icon as={NotebookPen} size={16} />
          <Text>Open the Notes example</Text>
        </Button>
        <Text className="border-l-2 border-primary/50 pl-4 text-sm leading-7 text-muted-foreground">
          {prompt}
        </Text>
        <CopyPrompt text={prompt} />
      </View>
      {isAdmin && (
        <View className="gap-3 rounded-xl border border-border bg-card px-5 py-4">
          <Text className="text-sm leading-6 text-muted-foreground">
            Your role can read every account’s notes.
          </Text>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onPress={() => router.push("/admin")}
          >
            <Icon as={ShieldCheck} size={16} />
            <Text>Open admin</Text>
          </Button>
        </View>
      )}
      <Text className="text-sm text-muted-foreground">
        Signed in as {user.email}
      </Text>
    </ScrollView>
  );
}
