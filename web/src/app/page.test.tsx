import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, vi } from "vitest";

import ChatPage from "./chat-page";

afterEach(() => {
  vi.restoreAllMocks();
});

it("shows the student's question and the assistant answer in the transcript after submit", async () => {
  const fetchMock = vi
    .spyOn(global, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          question: "What is machine learning?",
          supportLevel: "strong",
          answer: "Machine learning helps systems learn patterns from data.",
          sources: [
            {
              chunkId: "chunk-1",
              documentId: "doc-1",
              documentTitle: "AI Course Intro Notes",
              excerpt: "Machine learning is a subset of artificial intelligence.",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

  render(<ChatPage />);

  await userEvent.click(screen.getByRole("button", { name: "Ask Notes" }));

  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  expect(
    await screen.findByText("Machine learning helps systems learn patterns from data.")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Conversation" })
  ).toBeInTheDocument();

  const transcript = await screen.findByLabelText("Conversation transcript");
  expect(within(transcript).getByText("Student")).toBeInTheDocument();
  expect(within(transcript).getByText("Notes Assistant")).toBeInTheDocument();
  expect(within(transcript).getByText("What is machine learning?")).toBeInTheDocument();
});

it("shows an assistant loading message in the transcript while the answer is being fetched", async () => {
  let resolveRequest: ((value: Response) => void) | undefined;
  vi.spyOn(global, "fetch").mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve;
    })
  );

  render(<ChatPage />);

  await userEvent.click(screen.getByRole("button", { name: "Ask Notes" }));

  const transcript = screen.getByLabelText("Conversation transcript");
  expect(within(transcript).getByText("Student")).toBeInTheDocument();
  expect(within(transcript).getByText("Notes Assistant")).toBeInTheDocument();
  expect(
    within(transcript).getByText("Searching the course notes for grounded support...")
  ).toBeInTheDocument();

  resolveRequest?.(
    new Response(
      JSON.stringify({
        question: "What is machine learning?",
        supportLevel: "strong",
        answer: "Machine learning helps systems learn patterns from data.",
        sources: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  );

  expect(
    await screen.findByText("Machine learning helps systems learn patterns from data.")
  ).toBeInTheDocument();
});

it("shows a clear assistant error message when the API request fails", async () => {
  vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network down"));

  render(<ChatPage />);

  await userEvent.click(screen.getByRole("button", { name: "Ask Notes" }));

  const transcript = await screen.findByLabelText("Conversation transcript");
  expect(within(transcript).getByText("Student")).toBeInTheDocument();
  expect(within(transcript).getByText("Notes Assistant")).toBeInTheDocument();
  expect(
    within(transcript).getByText("Could not reach the API route.")
  ).toBeInTheDocument();
});
