import { useState } from "react";
import { View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import type { NoteDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { errorMessage } from "@/lib/api/client";
import { useDeleteNote, useUpdateNote } from "../hooks";
import { NoteForm } from "./note-form";

export const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

export function NoteItem({ note }: { note: NoteDto }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateNote();
  const remove = useDeleteNote();

  if (editing)
    return (
      <View className="rounded-xl border border-border bg-card px-5 py-4">
        <NoteForm
          idPrefix={`edit-${note.id}`}
          initial={note}
          submitLabel="Save changes"
          pending={update.isPending}
          error={update.error}
          onSubmit={async (input) => {
            await update.mutateAsync({ id: note.id, input });
            setEditing(false);
          }}
          onCancel={() => {
            update.reset();
            setEditing(false);
          }}
        />
      </View>
    );

  return (
    <View
      className="rounded-xl border border-border bg-card px-5 py-4"
      testID="note"
    >
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1">
          <Text className="font-medium">{note.title}</Text>
          {note.content ? (
            <Text className="mt-1 text-sm leading-6 text-muted-foreground">
              {note.content}
            </Text>
          ) : null}
          <Text className="mt-2 text-xs text-muted-foreground">
            {dateFormat.format(new Date(note.createdAt))}
          </Text>
        </View>
        <View className="shrink-0 flex-row gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${note.title}`}
            onPress={() => setEditing(true)}
          >
            <Icon as={Pencil} size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${note.title}`}
            disabled={remove.isPending}
            onPress={() => remove.mutate(note.id)}
          >
            <Icon as={Trash2} size={16} />
          </Button>
        </View>
      </View>
      {remove.error ? (
        <Text role="alert" className="mt-2 text-sm text-destructive">
          {errorMessage(remove.error)}
        </Text>
      ) : null}
    </View>
  );
}
