import { describe, expect, it, jest } from "@jest/globals";
import { render, screen, userEvent } from "@testing-library/react-native";
import { NoteForm } from "@/features/notes/components/note-form";
import { ApiError } from "@/lib/api/client";

jest.mock("@/lib/auth-client", () => ({ authClient: {} }));

async function renderForm(props: Partial<Parameters<typeof NoteForm>[0]> = {}) {
  const onSubmit = jest.fn<
    (values: { title: string; content: string }) => Promise<void>
  >(async () => {});
  await render(
    <NoteForm
      idPrefix="new"
      submitLabel="Add note"
      pending={false}
      error={null}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return onSubmit;
}

describe("NoteForm", () => {
  it("submits a trimmed title and clears itself after creating", async () => {
    const onSubmit = await renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByTestId("new-title"), "  Groceries  ");
    await user.press(screen.getByText("Add note"));

    expect(onSubmit).toHaveBeenCalledWith({ title: "Groceries", content: "" });
    expect(screen.getByTestId("new-title").props.value).toBe("");
  });

  it("does not submit without a title", async () => {
    const onSubmit = await renderForm();
    await userEvent.setup().press(screen.getByText("Add note"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the API's field error", async () => {
    await renderForm({
      error: new ApiError(422, "VALIDATION_ERROR", "Check the fields.", [
        { field: "title", message: "Too long" },
      ]),
    });
    expect(screen.getByRole("alert")).toHaveTextContent("title: Too long");
  });
});
