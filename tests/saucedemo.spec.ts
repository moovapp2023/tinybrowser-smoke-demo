import type { Page } from '@playwright/test';
import { expect, test } from './tinybrowser.fixture';

function siteUrl(): string {
  const raw = process.env.BASE_URL ?? 'https://www.saucedemo.com';
  return raw.replace(/\/$/, '');
}

async function login(page: Page): Promise<void> {
  const username = process.env.SAUCE_USER ?? 'standard_user';
  await page.goto(siteUrl());
  await page.locator('[data-test="username"]').fill(username);
  await page.locator('[data-test="password"]').fill('secret_sauce');
  await page.locator('[data-test="login-button"]').click();
  await expect(page).toHaveURL(/inventory\.html/);
}

test('logs in and shows the product list', async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-test="title"]')).toHaveText('Products');
  await expect(page.locator('.inventory_item').first()).toBeVisible();
});

test('adds two items and shows the cart badge', async ({ page }) => {
  await login(page);
  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  await page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]').click();
  await expect(page.locator('[data-test="shopping-cart-badge"]')).toHaveText('2');
});

test('completes a checkout', async ({ page }) => {
  await login(page);
  await page.locator('[data-test="add-to-cart-sauce-labs-backpack"]').click();
  await page.locator('[data-test="shopping-cart-link"]').click();
  await page.locator('[data-test="checkout"]').click();
  await page.locator('[data-test="firstName"]').fill('Ada');
  await page.locator('[data-test="lastName"]').fill('Lovelace');
  await page.locator('[data-test="postalCode"]').fill('94016');
  await page.locator('[data-test="continue"]').click();
  await page.locator('[data-test="finish"]').click();
  await expect(page.locator('[data-test="complete-header"]')).toHaveText(
    'Thank you for your order!',
  );
});
