import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";

// pnpm test:e2e sets EXPO_PUBLIC_E2E. iOS answers a secure password field
// with strong-password and save-password sheets, system UI that Maestro cannot
// dismiss, so test runs use a plain field. Every other build is unchanged.
const e2e = process.env.EXPO_PUBLIC_E2E === "1";

// Sign-in and sign-up. On success the session updates and the root layout's
// guards move the user into the app; no navigation happens here.
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const credentials = { email: email.trim(), password };
      const result = signingUp
        ? await authClient.signUp.email({ ...credentials, name: name.trim() })
        : await authClient.signIn.email(credentials);
      if (result.error)
        setError(
          signingUp
            ? result.error.message ||
                "We couldn't create your account. Please try again."
            : "We couldn't sign you in. Check your email and password and try again.",
        );
    } catch {
      setError(
        "We couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const incomplete =
    !email.trim() || password.length < 8 || (signingUp && !name.trim());

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-8 p-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Text className="text-sm font-medium text-muted-foreground">
            {signingUp ? "A place to begin" : "Good to see you"}
          </Text>
          <Text className="text-3xl font-semibold tracking-tight">
            {signingUp ? "Create your account" : "Welcome back"}
          </Text>
          <Text className="text-base leading-7 text-muted-foreground">
            {signingUp
              ? "One small step. Then make this app your own."
              : "Sign in to pick up where you left off."}
          </Text>
        </View>
        <View className="gap-5" aria-busy={pending}>
          {signingUp && (
            <View className="gap-2">
              <Label nativeID="name-label">Name</Label>
              <Input
                aria-labelledby="name-label"
                testID="name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                textContentType="name"
                placeholder="Your name"
                maxLength={100}
                editable={!pending}
              />
            </View>
          )}
          <View className="gap-2">
            <Label nativeID="email-label">Email</Label>
            <Input
              aria-labelledby="email-label"
              testID="email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              maxLength={254}
              editable={!pending}
            />
          </View>
          <View className="gap-2">
            <Label nativeID="password-label">Password</Label>
            <Input
              aria-labelledby="password-label"
              testID="password"
              value={password}
              onChangeText={setPassword}
              {...(e2e
                ? { autoCapitalize: "none", autoComplete: "off" }
                : {
                    secureTextEntry: true,
                    textContentType: signingUp ? "newPassword" : "password",
                    autoComplete: signingUp
                      ? "new-password"
                      : "current-password",
                  })}
              maxLength={128}
              editable={!pending}
              onSubmitEditing={incomplete ? undefined : submit}
            />
            {signingUp && (
              <Text className="text-sm text-muted-foreground">
                Use at least 8 characters.
              </Text>
            )}
          </View>
          {error ? (
            <Text
              role="alert"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
            >
              {error}
            </Text>
          ) : null}
          <Button size="lg" onPress={submit} disabled={pending || incomplete}>
            {pending ? (
              <ActivityIndicator className="text-primary-foreground" />
            ) : null}
            <Text>
              {pending
                ? "Please wait…"
                : signingUp
                  ? "Create account"
                  : "Sign in"}
            </Text>
          </Button>
        </View>
        <View className="flex-row justify-center gap-1">
          <Text className="text-sm text-muted-foreground">
            {signingUp ? "Already have an account?" : "New here?"}
          </Text>
          <Link href={signingUp ? "/sign-in" : "/sign-up"} replace>
            <Text className="text-sm font-medium underline">
              {signingUp ? "Sign in" : "Create an account"}
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
