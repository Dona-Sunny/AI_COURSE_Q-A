import { expect, test } from "@playwright/test";

test("student sees a deterministic refusal when the notes do not support the question", async ({
  page,
}) => {
  await page.goto("/");

  const questionField = page.getByLabel("Ask a course concept question");
  await expect(questionField).toHaveValue("What is machine learning?");
  await questionField.fill("What is blockchain consensus?");
  await page.getByRole("button", { name: "Ask Notes" }).click();

  const transcript = page.getByLabel("Conversation transcript");

  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();
  await expect(transcript.getByText("Student")).toBeVisible();
  await expect(transcript.getByText("Notes Assistant")).toBeVisible();
  await expect(
    transcript.getByText("What is blockchain consensus?", { exact: true })
  ).toBeVisible();
  await expect(
    transcript.getByText(
      "I could not find enough relevant information in the course notes to answer that confidently."
    )
  ).toBeVisible();
  await expect(
    transcript.locator("span").filter({ hasText: /^none$/ })
  ).toBeVisible();
  await expect(transcript.getByRole("heading", { name: "Sources" })).toHaveCount(0);
});
