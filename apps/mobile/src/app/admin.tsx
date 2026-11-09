import { FlatList, RefreshControl, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ListState } from "@/components/list-state";
import { useAdminNotes, useDeleteAnyNote } from "@/features/admin/hooks";
import { dateFormat } from "@/features/notes/components/note-item";
import { errorMessage } from "@/lib/api/client";

// Reached only when the role allows it (the root layout's guard), and the API
// re-checks the permission on every request.
export default function AdminScreen() {
  const notes = useAdminNotes();
  const remove = useDeleteAnyNote();

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-6"
      contentInsetAdjustmentBehavior="automatic"
      data={notes.data?.data ?? []}
      keyExtractor={(note) => note.id}
      ListHeaderComponent={
        <View className="mb-3 gap-2">
          <Text className="text-sm leading-6 text-muted-foreground">
            Every account’s notes, newest first. Deleting here removes the note
            for its owner too.
          </Text>
          {remove.error ? (
            <Text role="alert" className="text-sm text-destructive">
              {errorMessage(remove.error)}
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <View
          className="flex-row items-start justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4"
          testID="admin-note"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-medium">{item.title}</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {item.ownerName} · {item.ownerEmail}
            </Text>
            <Text className="mt-2 text-xs text-muted-foreground">
              {dateFormat.format(new Date(item.createdAt))}
            </Text>
          </View>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${item.title}`}
            disabled={remove.isPending}
            onPress={() => remove.mutate(item.id)}
          >
            <Icon as={Trash2} size={16} />
          </Button>
        </View>
      )}
      ListEmptyComponent={
        <ListState
          loading={notes.isPending}
          error={notes.error}
          onRetry={() => void notes.refetch()}
          empty="No notes in any account yet."
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={notes.isRefetching}
          onRefresh={() => void notes.refetch()}
        />
      }
    />
  );
}
