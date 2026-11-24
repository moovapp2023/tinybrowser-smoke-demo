# Smoke tests through TinyBrowser

Three Playwright smoke checks against the practice shop https://www.saucedemo.com. They run in [TinyBrowser](https://docs.tinyfish.ai/tinybrowser), the TinyFish cloud browser, so the machine running them needs no browser of its own: no `playwright install`, no system packages and no browser image.

This is the code from the TinyFish article "How to Run Playwright Smoke Tests in Grok Build with TinyBrowser". Grok Build wrote the tests, the fixture and the Playwright config from one prompt. We added the workflow and one line in the fixture (`BROWSER=local`) so the same checks can run on a local browser for comparison.

## What's here

| File | What it does |
| --- | --- |
| `tests/tinybrowser.fixture.ts` | Opens one TinyBrowser session per test, connects Playwright to it, and deletes the session when the test ends, pass or fail |
| `tests/saucedemo.spec.ts` | The three checks: log in, add two items to the cart, complete a checkout |
| `playwright.config.ts` | Three checks at a time, a screenshot on failure |
| `.github/workflows/smoke.yml` | The GitHub Actions workflow, started by hand |

## Run it on your machine

You need Node.js 22 and a TinyFish API key from https://agent.tinyfish.ai/api-keys. Browser sessions are billed by the minute from your TinyFish Wallet; see https://www.tinyfish.ai/pricing for the current rate.

```bash
npm ci
export TINYFISH_API_KEY="your_api_key_here"
npx playwright test
```

Two optional settings:

- `BASE_URL` points the checks at another address. The checks themselves are written for saucedemo, so change them for your own site.
- `SAUCE_USER=problem_user` logs in with an account saucedemo breaks on purpose. The checkout check then fails and saves a screenshot in `test-results/`.

## Run it in GitHub Actions

1. Copy or fork this repository.
2. Under Settings, Secrets and variables, Actions, add a repository secret named `TINYFISH_API_KEY`.
3. Open the Actions tab, choose "Smoke tests" and select "Run workflow".

The workflow has three jobs that run the same checks:

- **TinyBrowser**: a plain Node.js container with no browser in it.
- **Local Chromium, installed**: the same container, with `npx playwright install --with-deps chromium` first.
- **Local Chromium, Playwright's image**: Playwright's own container image, which has the browsers in it.

To use this for your own site you only need the first job.

## What we measured

Five runs on 24 November 2026, on GitHub's US runners, with nothing cached. Median times:

| Job | Whole job | Tests step |
| --- | --- | --- |
| TinyBrowser | 24 s | 12 s |
| Local Chromium, installed | 46 s | 4 s |
| Local Chromium, Playwright's image | 52 s | 5 s |

The TinyBrowser job finishes first because it has no browser to install or pull. Its tests step is the slower one, because every click travels to the remote browser. So the saving is for a short suite like this one; a long suite will run faster on a local browser, and a cached browser or image would shorten the two local jobs.

## Sessions

Each test opens its own session, because a TinyBrowser session held one browser context in our tests. The fixture deletes the session in a `finally` block, and `timeout_seconds: 120` closes it after two idle minutes if that never runs.
