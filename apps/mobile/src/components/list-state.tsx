import { ActivityIndicator, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/api/client";

// The body of a list while it loads, fails, or has no rows yet.
export function ListState({
  loading,
  error,
  onRetry,
  empty,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  empty: string;
}) {
  if (loading)
    return (
      <View className="items-center py-10">
        <ActivityIndicator className="text-muted-foreground" />
      </View>
    );
  if (error)
    return (
      <View className="items-start gap-3 py-6" role="alert">
        <Text className="text-sm text-destructive">{errorMessage(error)}</Text>
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Text>Try again</Text>
        </Button>
      </View>
    );
  return (
    <Text className="py-6 text-center text-sm text-muted-foreground">
      {empty}
    </Text>
  );
}
