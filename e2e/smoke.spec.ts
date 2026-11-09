import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "日語學習" })
  ).toBeVisible();
  await expect(
    page.getByText("第一階段：腳手架與部署設定")
  ).toBeVisible();
});
