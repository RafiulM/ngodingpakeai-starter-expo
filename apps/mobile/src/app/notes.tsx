import { FlatList, RefreshControl, View } from "react-native";
import { Text } from "@/components/ui/text";
import { ListState } from "@/components/list-state";
import { NoteForm } from "@/features/notes/components/note-form";
import { NoteItem } from "@/features/notes/components/note-item";
import { useCreateNote, useNotes } from "@/features/notes/hooks";

export default function NotesScreen() {
  const notes = useNotes();
  const items = notes.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="gap-3 p-6"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      data={items}
      keyExtractor={(note) => note.id}
      renderItem={({ item }) => <NoteItem note={item} />}
      ListHeaderComponent={<CreateNote />}
      ListEmptyComponent={
        <ListState
          loading={notes.isPending}
          error={notes.error}
          onRetry={() => void notes.refetch()}
          empty="No notes yet. Add the first one above."
        />
      }
      onEndReached={() => {
        if (notes.hasNextPage && !notes.isFetchingNextPage)
          notes.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl
          refreshing={notes.isRefetching && !notes.isFetchingNextPage}
          onRefresh={() => void notes.refetch()}
        />
      }
    />
  );
}

function CreateNote() {
  const create = useCreateNote();
  return (
    <View className="mb-3 gap-4 rounded-xl border border-border bg-card px-5 py-5">
      <Text className="text-base font-semibold">New note</Text>
      <NoteForm
        idPrefix="new-note"
        submitLabel="Add note"
        pending={create.isPending}
        error={create.error}
        onSubmit={(input) => create.mutateAsync(input)}
      />
    </View>
  );
}
