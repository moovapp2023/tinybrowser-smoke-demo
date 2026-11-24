import {
  test as base,
  chromium,
  type Browser,
  type Page,
  type TestInfo,
} from '@playwright/test';

const API = 'https://api.browser.tinyfish.ai';

type SessionBody = {
  session_id?: string;
  sessionId?: string;
  cdp_url?: string;
  cdpUrl?: string;
};

function requireApiKey(): string {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new Error('TINYFISH_API_KEY is required');
  }
  return apiKey;
}

async function createSession(apiKey: string): Promise<{ sessionId: string; cdpUrl: string }> {
  const response = await fetch(API, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ timeout_seconds: 120 }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`TinyBrowser session create failed: ${response.status} ${text.slice(0, 300)}`);
  }

  let body: SessionBody;
  try {
    body = JSON.parse(text) as SessionBody;
  } catch {
    throw new Error('TinyBrowser session create returned non-JSON');
  }

  const sessionId = body.session_id ?? body.sessionId;
  const cdpUrl = body.cdp_url ?? body.cdpUrl;
  if (!sessionId || !cdpUrl) {
    throw new Error(
      `TinyBrowser session create missing session_id or cdp_url (keys: ${Object.keys(body).join(', ')})`,
    );
  }
  return { sessionId, cdpUrl };
}

async function deleteSession(apiKey: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API}/${sessionId}`, {
    method: 'DELETE',
    headers: { 'X-API-Key': apiKey },
  });
  if (response.ok || response.status === 404) {
    return;
  }
  const text = await response.text();
  throw new Error(`TinyBrowser session delete failed: ${response.status} ${text.slice(0, 300)}`);
}

async function saveFailureScreenshot(page: Page | undefined, testInfo: TestInfo): Promise<void> {
  if (!page || testInfo.status === testInfo.expectedStatus) {
    return;
  }
  try {
    const path = testInfo.outputPath('failure.png');
    await page.screenshot({ path, fullPage: true });
    await testInfo.attach('failure', { path, contentType: 'image/png' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`failure screenshot failed: ${message}`);
  }
}

const remote = base.extend<{ page: Page }>({
  page: async ({}, use, testInfo) => {
    const apiKey = requireApiKey();
    const { sessionId, cdpUrl } = await createSession(apiKey);
    let browser: Browser | undefined;
    let page: Page | undefined;

    try {
      browser = await chromium.connectOverCDP(cdpUrl);
      // TinyBrowser allows a single context. CDP attach often opens that
      // default context already; a second newContext() is rejected.
      const context = browser.contexts()[0] ?? (await browser.newContext());
      page = await context.newPage();
      await use(page);
    } finally {
      await saveFailureScreenshot(page, testInfo);
      await browser?.close().catch(() => undefined);
      await deleteSession(apiKey, sessionId);
    }
  },
});

// Added for the CI comparison only: BROWSER=local runs the same checks on Chromium installed on the runner.
export const test = process.env.BROWSER === 'local' ? base : remote;

export { expect } from '@playwright/test';
