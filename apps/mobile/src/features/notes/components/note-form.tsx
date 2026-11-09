import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import type { NoteDto } from "@starter/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api/client";

type Values = { title: string; content: string };

// Used for both creating and editing. The parent supplies the mutation; this
// component only owns the fields.
export function NoteForm({
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
  idPrefix,
}: {
  initial?: Pick<NoteDto, "title" | "content">;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (values: Values) => Promise<unknown>;
  onCancel?: () => void;
  idPrefix: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");

  async function submit() {
    if (pending || !title.trim()) return;
    try {
      await onSubmit({ title: title.trim(), content });
      if (!initial) {
        setTitle("");
        setContent("");
      }
    } catch {
      // The mutation's error state renders below.
    }
  }

  return (
    <View className="gap-4" aria-busy={pending}>
      <View className="gap-2">
        <Label nativeID={`${idPrefix}-title-label`}>Title</Label>
        <Input
          aria-labelledby={`${idPrefix}-title-label`}
          testID={`${idPrefix}-title`}
          value={title}
          onChangeText={setTitle}
          maxLength={160}
          placeholder="What's on your mind?"
        />
      </View>
      <View className="gap-2">
        <Label nativeID={`${idPrefix}-content-label`}>Details</Label>
        <Textarea
          aria-labelledby={`${idPrefix}-content-label`}
          testID={`${idPrefix}-content`}
          value={content}
          onChangeText={setContent}
          maxLength={10_000}
          numberOfLines={3}
          placeholder="Optional"
        />
      </View>
      {error ? (
        <Text
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {errorMessage(error)}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        <Button onPress={submit} disabled={pending || !title.trim()}>
          {pending ? (
            <ActivityIndicator className="text-primary-foreground" />
          ) : null}
          <Text>{pending ? "Saving…" : submitLabel}</Text>
        </Button>
        {onCancel && (
          <Button variant="ghost" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
        )}
      </View>
    </View>
  );
}
