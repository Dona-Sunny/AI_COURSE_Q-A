import { expect, test } from "@playwright/test";

test("student can ask a supported question and see grounded results", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Ask grounded questions from your AI course notes." })
  ).toBeVisible();

  await page.getByLabel("Ask a course concept question").fill(
    "What is machine learning?"
  );
  await page.getByRole("button", { name: "Ask Notes" }).click();

  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();
  await expect(page.getByText("Student")).toBeVisible();
  await expect(page.getByText("Notes Assistant")).toBeVisible();
  await expect(page.getByText("What is machine learning?")).toBeVisible();
  await expect(page.getByText(/stub answer for/i)).toBeVisible();
  await expect(page.getByText("strong")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
});
