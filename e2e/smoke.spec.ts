import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "日語學習" })
  ).toBeVisible();
  await expect(
    page.getByText("第一階段：腳手架與本機儲存")
  ).toBeVisible();
});

test("local state layer seeds and reports a summary", async ({ page }) => {
  await page.goto("/");

  const card = page.getByRole("heading", { name: "本機進度" });
  await expect(card).toBeVisible();

  // The store seeds on first open, so the counters must resolve to numbers.
  await expect(page.getByText("複習卡")).toBeVisible();
  await expect(page.getByText("作答紀錄")).toBeVisible();
  await expect(page.getByRole("button", { name: "匯出進度" })).toBeEnabled();
});
