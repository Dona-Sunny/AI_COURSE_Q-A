import { expect, test } from "@playwright/test";

test("student can ask a supported question and see grounded results", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Ask grounded questions from your AI course notes." })
  ).toBeVisible();

  const questionField = page.getByLabel("Ask a course concept question");
  await expect(questionField).toHaveValue("What is machine learning?");
  await questionField.fill("What is machine learning?");
  await page.getByRole("button", { name: "Ask Notes" }).click();

  const transcript = page.getByLabel("Conversation transcript");

  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();
  await expect(transcript.getByText("Student")).toBeVisible();
  await expect(transcript.getByText("Notes Assistant")).toBeVisible();
  await expect(transcript.getByText("What is machine learning?", { exact: true })).toBeVisible();
  await expect(transcript.getByText(/stub answer for/i)).toBeVisible();
  await expect(
    transcript.locator("span").filter({ hasText: /^strong$/ })
  ).toBeVisible();
  await expect(transcript.getByRole("heading", { name: "Sources" })).toBeVisible();
});
