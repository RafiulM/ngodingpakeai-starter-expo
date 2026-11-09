import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getNote, listNotes } from "./api";

export const NOTES_PAGE_SIZE = 20;

// Hierarchical keys: invalidating notesKeys.lists() refreshes the list,
// notesKeys.all refreshes everything about notes.
export const notesKeys = {
  all: ["notes"] as const,
  lists: () => [...notesKeys.all, "list"] as const,
  details: () => [...notesKeys.all, "detail"] as const,
  detail: (id: string) => [...notesKeys.details(), id] as const,
};

// The list loads a page at a time as the user scrolls (the API's offset
// pagination). Pages live together in one cache entry.
export function notesListQuery() {
  return infiniteQueryOptions({
    queryKey: notesKeys.lists(),
    queryFn: ({ pageParam, signal }) =>
      listNotes({ limit: NOTES_PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: ({ meta }) =>
      meta.hasMore ? meta.offset + meta.limit : undefined,
  });
}

export function noteQuery(id: string) {
  return queryOptions({
    queryKey: notesKeys.detail(id),
    queryFn: ({ signal }) => getNote(id, signal),
  });
}
