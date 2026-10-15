import { expect, test, type Page } from '@playwright/test';

const PREFIX = '@ecotrek/experience-test/';
const transparentTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');

async function enter(page: Page, route: string) {
  await page.goto(`${route}?web=1`);
  await page.locator('#ecotrek-splash').waitFor({ state: 'hidden' });
}

test.beforeEach(async ({ context, baseURL }) => {
  const appOrigin = new URL(baseURL!).origin;
  await context.addInitScript((origin) => {
    if (location.origin !== origin) return;
    if (!localStorage.getItem('@ecotrek/auth_user')) {
      localStorage.setItem('@ecotrek/auth_user', JSON.stringify({ id: 'experience-test', name: 'Alex', email: 'test@example.com', provider: 'guest' }));
      localStorage.setItem('@ecotrek/experience-test/user_profile', JSON.stringify({ firstName: 'Alex', lastName: '', weightHistory: [] }));
      localStorage.setItem('@ecotrek/experience-test/start_tutorial_complete', 'true');
      localStorage.setItem('@ecotrek/experience-test/gems', JSON.stringify([{ id: 'fixture', reason: 'activity', amount: 5000, timestamp: Date.now(), label: 'Test fixture' }]));
      localStorage.setItem('ecotrek.launcher.dismissed', '1');
    }
  }, appOrigin);
  // Offline by default. Individual tests simulate a successful tile/provider
  // response; no external service or account is consumed by the test suite.
  await context.route('https://**/*', (route) => new URL(route.request().url()).origin === appOrigin ? route.continue() : route.abort());
});

test('Start has only the two selected character cutouts and an unmistakable active tab', async ({ page }) => {
  await enter(page, '/track');
  await expect(page.getByRole('radio', { name: 'Walk, On foot' })).toBeChecked();
  const images = page.getByRole('radiogroup').locator('img');
  await expect(images).toHaveCount(2);
  for (const image of await images.all()) {
    const box = await image.boundingBox();
    expect(box!.width).toBeLessThan(185);
    expect(box!.height).toBeLessThan(230);
  }
  await expect(page.getByTestId('tab-start-active')).toBeVisible();
  await page.getByRole('radio', { name: 'Bike, Ride' }).click();
  await expect(page.getByRole('button', { name: 'Start ride', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'More', exact: true }).click();
  await expect(page.getByTestId('tab-more-active')).toBeVisible();
  await expect(page.getByText('Text size, look, units')).toBeVisible();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('tab-home-active')).toBeVisible();
});

test('weekly care persists, cannot be repeated or rush age, and life-stage illustrations are free', async ({ page }) => {
  await enter(page, '/tree');
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add water for 1 gem', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Water complete this week', exact: true })).toBeDisabled();
  for (const kind of ['sunlight', 'soil']) await page.getByRole('button', { name: `Add ${kind} for 1 gem`, exact: true }).click();
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).reduce((sum: number, event: { amount: number }) => sum + event.amount, 0), `${PREFIX}gems`)).toBe(4997);
  const stored = await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}tree-growth`);
  await page.getByRole('button', { name: 'Explore 100 images', exact: true }).click();
  await expect(page.getByText('Illustrations only · not your live progress')).toBeVisible();
  await page.getByRole('button', { name: 'Preview Sage tree', exact: true }).click();
  await expect(page.getByText('Image 100 of 100 · At least 18 months')).toBeVisible();
  await page.getByLabel('Close', { exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}tree-growth`)).toBe(stored);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Water complete this week', exact: true })).toBeDisabled();
  await expect(page.getByText('4997', { exact: true })).toBeVisible();
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('autumn-leaves')).toHaveCount(0);
});

test('weekly water, soil and sunlight improve growth pace once each; the preview exposes all 100 values', async ({ page }) => {
  await enter(page, '/tree');
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('tree-growth-factor').getByText('4% pace')).toBeVisible();
  await page.getByRole('button', { name: 'Add water for 1 gem', exact: true }).click();
  await expect(page.getByTestId('tree-growth-factor').getByText('19% pace')).toBeVisible();
  await page.getByRole('button', { name: 'Add soil for 1 gem', exact: true }).click();
  await expect(page.getByTestId('tree-growth-factor').getByText('45% pace')).toBeVisible();
  await page.getByRole('button', { name: 'Add sunlight for 1 gem', exact: true }).click();
  await expect(page.getByTestId('tree-growth-factor').getByText('75% pace')).toBeVisible();
  const stored = await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}tree-growth`);
  await page.getByRole('button', { name: 'Explore 100 images', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Little sapling', exact: true }).click();
  const sapling = await page.getByTestId('tree-growth-image').last().locator('img').getAttribute('src');
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  const next = await page.getByTestId('tree-growth-image').last().locator('img').getAttribute('src');
  expect(next).not.toBe(sapling);
  await page.getByRole('button', { name: 'Preview First flower', exact: true }).click();
  await expect(page.getByText('Image 53 of 100 · 7 months')).toBeVisible();
  await page.getByRole('button', { name: 'Preview Sage tree', exact: true }).click();
  await expect(page.getByText('Image 100 of 100 · At least 18 months')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next image', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}tree-growth`)).toBe(stored);
  await page.reload();
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('tree-growth-factor').getByText('75% pace')).toBeVisible();
});

function isoWeek(time: number): string {
  const local = new Date(time);
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return `${date.getUTCFullYear()}-W${String(Math.ceil(((date.getTime() - start.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
function treeFixture(plantedAt: number, credited: number, now: number) {
  const keys = [...new Set([...Array.from({ length: Math.max(0, credited - 1) }, (_, i) => isoWeek(plantedAt + i * 7 * 86400000)), ...(credited ? [isoWeek(now)] : [])])];
  return { version: 2, plantedAt, lastSeenAt: now, careWeek: isoWeek(now), care: { water: 1, sun: 1, nutrients: 1 }, careWeeks: keys, outdoorWeeks: keys, forest: 0, goldenApples: 0, harvestedWeeks: [] };
}

// Fixtures are test-only persisted histories, not an age bypass in the app.
test('the actual calendar birthday gates maturity and automatic autumn shedding', async ({ context, page, baseURL }) => {
  const anniversary = new Date(2026, 9, 14, 12).getTime();
  const birthday = new Date(2025, 9, 14, 12).getTime();
  await page.clock.setFixedTime(anniversary - 1);
  await context.addInitScript(({ origin, tree }) => {
    if (location.origin === origin && !localStorage.getItem('@ecotrek/experience-test/tree-growth')) localStorage.setItem('@ecotrek/experience-test/tree-growth', JSON.stringify(tree));
  }, { origin: new URL(baseURL!).origin, tree: treeFixture(birthday, 52, anniversary - 1) });
  await enter(page, '/tree');
  await expect(page.getByText('Growth image 80 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('autumn-leaves')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Collect golden apple', exact: true })).toHaveCount(0);
  await page.clock.setFixedTime(anniversary);
  await page.reload();
  await expect(page.getByText('Growth image 81 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('autumn-leaves')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Collect golden apple', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save sage & plant a new seed', exact: true })).toHaveCount(0);
});

test('sage takes 18 months; golden apples survive a confirmed new planting without gem inflation', async ({ context, page, baseURL }) => {
  const now = new Date(2026, 9, 14, 12).getTime();
  const birthday = new Date(2025, 3, 14, 12).getTime();
  await page.clock.setFixedTime(now);
  await context.addInitScript(({ origin, tree }) => {
    if (location.origin === origin && !localStorage.getItem('@ecotrek/experience-test/tree-growth')) localStorage.setItem('@ecotrek/experience-test/tree-growth', JSON.stringify(tree));
  }, { origin: new URL(baseURL!).origin, tree: treeFixture(birthday, 78, now) });
  await enter(page, '/tree');
  await expect(page.getByText('Growth image 100 / 100', { exact: true })).toBeVisible();
  await expect(page.getByTestId('autumn-leaves')).toBeVisible();
  await page.getByRole('button', { name: 'Collect golden apple', exact: true }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).goldenApples, `${PREFIX}tree-growth`)).toBe(1);
  await expect(page.getByRole('button', { name: 'Collect golden apple', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save sage & plant a new seed', exact: true }).click();
  await page.getByRole('button', { name: 'Save sage & plant seed', exact: true }).click();
  await expect(page.getByText('Growth image 1 / 100', { exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), `${PREFIX}tree-growth`);
  expect(saved.forest).toBe(1); expect(saved.goldenApples).toBe(1); expect(saved.plantedAt).toBe(now);
  await expect(page.getByTestId('autumn-leaves')).toHaveCount(0);
  await expect(page.getByText('5000', { exact: true })).toBeVisible();
});

test('young trees retain their leaves in winter and everyone gets calendar snow scenery', async ({ context, page, baseURL }) => {
  const now = new Date(2026, 0, 14, 12).getTime();
  const birthday = new Date(2025, 10, 14, 12).getTime();
  await page.clock.setFixedTime(now);
  await context.addInitScript(({ origin, tree }) => {
    if (location.origin === origin) localStorage.setItem('@ecotrek/experience-test/tree-growth', JSON.stringify(tree));
  }, { origin: new URL(baseURL!).origin, tree: treeFixture(birthday, 8, now) });
  await enter(page, '/tree');
  await expect(page.getByText(/Growth image (2[0-5]) \/ 100/)).toBeVisible();
  await expect(page.getByTestId('winter-snow')).toBeVisible();
  await expect(page.getByTestId('autumn-leaves')).toHaveCount(0);
  await expect(page.getByTestId('tree-growth-scene').locator('img')).toHaveAttribute('src', /growth-02[0-4]/);
  await page.evaluate((key) => { const store = JSON.parse(localStorage.getItem(key)!); store.plantedAt = new Date(2025, 0, 14, 12).getTime(); localStorage.setItem(key, JSON.stringify(store)); }, `${PREFIX}tree-growth`);
  // A calendar year with only eight cared-for weeks is still not mature.
  await page.reload();
  await expect(page.getByText(/Growth image (2[0-5]) \/ 100/)).toBeVisible();
  await expect(page.getByTestId('winter-snow')).toBeVisible();
});

test('cold Trails is usable before GPS/network; ratings are visible, editable and persist with no automatic AI', async ({ context, page }) => {
  await context.clearPermissions();
  await context.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => {}; });
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await enter(page, '/trails');
  await expect(page.getByText('Offline collection · Austin, TX')).toBeVisible();
  const rate = page.getByRole('button', { name: /^Rate / }).first();
  await expect(rate).toBeVisible({ timeout: 1500 });
  const illustration = await page.getByTestId('trail-illustration').first().locator('svg').boundingBox();
  expect(illustration!.height).toBeGreaterThan(120);
  await rate.click();
  await expect(page.getByText('Your rating', { exact: true })).toBeVisible();
  await expect(page.getByText('AI trail notes', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Ask AI about it' })).toHaveCount(0);
  await expect(page.getByText('Photos are unavailable offline')).toHaveCount(0);
  expect(requests.some((url) => /puter\.com|api\.puter|commons\.wikimedia|nominatim|overpass/.test(url))).toBe(false);
  await page.getByRole('radio', { name: '5 stars', exact: true }).click();
  await expect(page.getByText('5 out of 5 · saved')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Your rating: 5/5', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /^Rate / }).first().click();
  await expect(page.getByRole('radio', { name: '5 stars', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Remove your rating', exact: true }).click();
  await expect(page.getByText('Rating removed.')).toBeVisible();
  await page.getByRole('button', { name: 'Before you go', exact: true }).click();
  await expect(page.getByText(/Check opening hours, closures/)).toBeVisible();
});

test('saved trails reopen without a location fix and stay clearly labelled saved', async ({ context, page }) => {
  await enter(page, '/trails');
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('@ecotrek/trail-catalogue-v1'))).toBe(true);
  await context.clearPermissions();
  await context.addInitScript(() => { navigator.geolocation.getCurrentPosition = () => {}; });
  await page.reload();
  await expect(page.getByText('Austin, TX · saved')).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole('button', { name: /^Rate / }).first()).toBeVisible();
  await expect(page.getByText(/Saved trails, not a current location lookup\.|Finding nearby trails\. Keep browsing meanwhile\./)).toBeVisible();
});

test('a delayed browser GPS fix updates Trails automatically without a second retry', async ({ context, page }) => {
  await context.addInitScript(() => {
    (window as any).__geoCalls = 0;
    navigator.geolocation.getCurrentPosition = (success) => {
      (window as any).__geoCalls += 1;
      setTimeout(() => success({ coords: { latitude: 30.2672, longitude: -97.7431, accuracy: 30 }, timestamp: Date.now() } as GeolocationPosition), 4600);
    };
  });
  await enter(page, '/trails');
  await expect(page.getByText('Offline collection · Austin, TX')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Rate / }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!localStorage.getItem('@ecotrek/trail-catalogue-v1')), { timeout: 8000 }).toBe(true);
  await expect(page.getByText('Offline collection · Austin, TX')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__geoCalls)).toBe(1);
});

test('Home is unmistakable and calmer, with the old action wall moved out of the way', async ({ page }) => {
  await enter(page, '/');
  await expect(page.getByTestId('tab-home-active')).toBeVisible();
  await expect(page.getByText('A little time outside.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start a walk', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore trails', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Your tree', exact: true })).toBeVisible();
  await expect(page.getByText('Quick actions', { exact: true })).toHaveCount(0);
  await expect(page.getByText('You have not walked yet', { exact: true })).toHaveCount(0);
  const titles = page.getByText('Home', { exact: true });
  expect(await titles.count()).toBeGreaterThanOrEqual(2); // header + selected tab
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 1280, height: 800 }, { width: 568, height: 320 }]) {
  test(`map owns the tracking screen; stop stays reachable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: transparentTile }));
    await enter(page, '/active-tracking');
    const map = page.getByTestId('tracking-map-area');
    await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
    const box = (await map.boundingBox())!;
    if (viewport.width > viewport.height) expect(box.width).toBeGreaterThan(viewport.width * 0.60);
    else expect(box.height).toBeGreaterThan(viewport.height * 0.54);
    const finish = page.getByRole('button', { name: 'Stop and save walk', exact: true });
    const control = (await finish.boundingBox())!;
    expect(control.y + control.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(control.x + control.width).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Recenter on my location' }).click();
    await finish.click();
    await expect(page.getByText('This one did not count', { exact: true })).toBeVisible();
  });
}

test('failed tiles fall back without an endless spinner, and retry recovers', async ({ page }) => {
  await enter(page, '/active-tracking');
  await expect(page.getByText('Map tiles unavailable', { exact: true })).toBeVisible({ timeout: 12000 });
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: transparentTile }));
  await page.getByRole('button', { name: 'Retry map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
  await expect(page.getByText('Map tiles unavailable', { exact: true })).toHaveCount(0);
});

test('the pinned SDK loads locally even when every external script request is blocked', async ({ page }) => {
  await enter(page, '/assistant');
  await expect(page.getByRole('button', { name: 'Connect Grok', exact: true })).toBeVisible({ timeout: 15000 });
  const sdk = await page.evaluate(() => ({ url: window.__ECOTREK_PUTER_SDK_URL__, chat: typeof window.puter?.ai?.chat }));
  expect(sdk.url).toMatch(/^\/assets\/vendor\/puter-.*\.js$/);
  expect(sdk.chat).toBe('function');
});

test('the bundled SDK opens a child window from Connect and reports cancellation honestly', async ({ page }) => {
  await enter(page, '/assistant');
  await expect(page.getByRole('button', { name: 'Connect Grok', exact: true })).toBeVisible();
  const opened = page.waitForEvent('popup');
  const destination = page.context().waitForEvent('request', { predicate: (request) => request.url().startsWith('https://puter.com/action/sign-in?') });
  await page.getByRole('button', { name: 'Connect Grok', exact: true }).click();
  const popup = await opened;
  // External requests are blocked; inspect the attempted URL rather than the
  // browser's resulting chrome-error document. No live sign-in is asserted.
  const authUrl = new URL((await destination).url());
  expect(authUrl.searchParams.get('request_auth')).toBe('true');
  expect(await popup.opener()).toBe(page);
  await popup.close();
  await expect(page.getByText('Puter sign-in was cancelled. Your on-device trail answers still work.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect Grok', exact: true })).toBeEnabled();
});

test('Grok requires a connection and labels an SDK response separately from offline facts', async ({ context, page }) => {
  await context.addInitScript(() => {
    let connected = false;
    (window as any).__puterCalls = [];
    window.puter = {
      auth: {
        isSignedIn: () => connected,
        signIn: () => { connected = true; return Promise.resolve({ success: true }); },
      },
      ai: { chat: async (messages, options) => {
        (window as any).__puterCalls.push({ messages, options });
        return { message: { content: messages[messages.length - 1].content.includes('single word') ? 'ready' : 'Leaves change colour as chlorophyll breaks down.' } };
      } },
    };
  });
  await enter(page, '/assistant');
  await page.getByPlaceholder('Ask about a trail…').fill('Tell me about nearby trails');
  await page.getByLabel('Send question', { exact: true }).click();
  await expect(page.getByText('On-device trail answer', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Connect Grok', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__puterCalls)).toHaveLength(0);
  await page.getByRole('button', { name: 'Connect Grok', exact: true }).click();
  await expect(page.getByText('Grok replied successfully. Online answers are connected through Puter.')).toBeVisible();
  await page.getByPlaceholder('Ask about a trail…').fill('Why do leaves change colour?');
  await page.getByLabel('Send question', { exact: true }).click();
  await expect(page.getByText('Leaves change colour as chlorophyll breaks down.', { exact: true })).toBeVisible();
  const calls = await page.evaluate(() => (window as any).__puterCalls);
  expect(calls).toHaveLength(2);
  expect(calls[1].options.model).toBe('x-ai/grok-4.7');
  expect(calls[1].messages.at(-1).content).toBe('Why do leaves change colour?');
  await page.evaluate(() => { window.puter!.ai!.chat = async () => { throw { code: 'insufficient_funds' }; }; });
  await page.getByPlaceholder('Ask about a trail…').fill('Which trail is easy?');
  await page.getByLabel('Send question', { exact: true }).click();
  await expect(page.getByText('On-device trail answer', { exact: true }).last()).toBeVisible();
  await expect(page.getByText(/Check your Puter credits or usage limits/).first()).toBeVisible();
  await page.evaluate(() => { window.puter!.ai!.chat = async () => ({ message: { content: 'ready' } }); });
  await page.getByRole('button', { name: 'Retry AI connection', exact: true }).click();
  await expect(page.getByText('Grok replied successfully. Online answers are connected through Puter.')).toBeVisible();
});

test('large-text dark mode keeps the active navigation and controls visible', async ({ context, page }) => {
  await context.addInitScript(() => localStorage.setItem('@ecotrek/settings', JSON.stringify({ appearance: 'dark', textSize: 'xlarge', units: 'imperial', tempUnit: 'F' })));
  await enter(page, '/track');
  await expect(page.getByTestId('tab-start-active')).toBeVisible();
  const activeColor = await page.getByTestId('tab-start-active').evaluate((node) => getComputedStyle(node).backgroundColor);
  expect(activeColor).not.toBe('rgba(0, 0, 0, 0)');
  await page.getByRole('button', { name: 'Start walk', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Start walk', exact: true })).toBeVisible();
});


test('the /app/ entry and old-WebView UUID polyfill support the bundled SDK', async ({ context, page }) => {
  await context.addInitScript(() => Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true }));
  await enter(page, '/app/');
  await page.getByRole('tab', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Assistant', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Connect Grok', exact: true })).toBeVisible();
  expect(await page.evaluate(() => crypto.randomUUID())).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/);
  expect(await page.evaluate(() => typeof window.puter?.ai?.chat)).toBe('function');
});
