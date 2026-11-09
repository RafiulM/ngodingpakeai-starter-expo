import { useState } from "react";
import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Check, Copy } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export function CopyPrompt({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await Clipboard.setStringAsync(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <View className="flex-row flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onPress={copy}>
        <Icon as={status === "copied" ? Check : Copy} />
        <Text>{status === "copied" ? "Copied" : "Copy prompt"}</Text>
      </Button>
      <Text className="text-sm text-muted-foreground" aria-live="polite">
        {status === "error"
          ? "Select the prompt above and copy it manually."
          : status === "copied"
            ? "Paste it into your AI editor."
            : ""}
      </Text>
    </View>
  );
}
