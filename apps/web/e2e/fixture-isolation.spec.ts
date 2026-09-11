import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const credentials = { email: 'teacher@example.test', password: 'change-me-in-development' };

test('a test-owned preset can be mutated and archived without changing Weekend Story', async ({ page }) => {
  const login = await page.request.post('/api/v1/auth/session', { data: credentials });
  expect(login.status()).toBe(204);
  const cookie = login.headers()['set-cookie']?.split(';')[0];
  const headers = cookie ? { cookie } : undefined;

  const presetsResponse = await page.request.get('/api/v1/minigame-presets', { headers });
  expect(presetsResponse.status()).toBe(200);
  const presets = await presetsResponse.json() as Array<{ id: string; title: string; prompt: string; durationSeconds: number }>;
  const weekendStory = presets.find(preset => preset.title === 'Weekend Story');
  expect(weekendStory).toBeDefined();
  const canonicalWeekendStory = { ...weekendStory! };

  const ownedTitle = `Playwright-owned preset ${randomUUID()}`;
  const create = await page.request.post('/api/v1/minigame-presets', {
    headers,
    data: { title: ownedTitle, prompt: 'A test-owned prompt.', durationSeconds: 30 },
  });
  expect(create.status()).toBe(201);
  const ownedPreset = await create.json() as { id: string; title: string; prompt: string; durationSeconds: number; archivedAt: string | null };
  expect(ownedPreset).toMatchObject({ title: ownedTitle, prompt: 'A test-owned prompt.', durationSeconds: 30, archivedAt: null });
  expect(ownedPreset.id).not.toBe(weekendStory!.id);

  const ownedPresets = (await (await page.request.get('/api/v1/minigame-presets', { headers })).json()) as Array<{ id: string; title: string }>;
  expect(ownedPresets.find(preset => preset.id === ownedPreset.id)).toMatchObject({ id: ownedPreset.id, title: ownedTitle });
  expect(ownedPresets.find(preset => preset.id === weekendStory!.id)).toMatchObject({ id: weekendStory!.id, title: 'Weekend Story' });

  const mutatedTitle = `${ownedTitle} mutated`;
  const update = await page.request.patch(`/api/v1/minigame-presets/${ownedPreset.id}`, {
    headers,
    data: { title: mutatedTitle, prompt: ownedPreset.prompt, durationSeconds: ownedPreset.durationSeconds },
  });
  expect(update.status()).toBe(200);
  await expect(update.json()).resolves.toMatchObject({ id: ownedPreset.id, title: mutatedTitle, archivedAt: null });

  const archive = await page.request.post(`/api/v1/minigame-presets/${ownedPreset.id}/archive`, { headers });
  expect(archive.status()).toBe(200);
  await expect(archive.json()).resolves.toMatchObject({ id: ownedPreset.id, title: mutatedTitle });

  const activeAfterArchive = (await (await page.request.get('/api/v1/minigame-presets', { headers })).json()) as Array<{ id: string; title: string }>;
  expect(activeAfterArchive.find(preset => preset.id === ownedPreset.id)).toBeUndefined();
  expect(activeAfterArchive.find(preset => preset.id === weekendStory!.id)).toMatchObject(canonicalWeekendStory);

  const archivedPresetsResponse = await page.request.get('/api/v1/minigame-presets?includeArchived=true', { headers });
  expect(archivedPresetsResponse.status()).toBe(200);
  const archivedPresets = await archivedPresetsResponse.json() as Array<{ id: string; title: string; archivedAt: string | null }>;
  expect(archivedPresets.find(preset => preset.id === ownedPreset.id)).toMatchObject({ id: ownedPreset.id, title: mutatedTitle, archivedAt: expect.any(String) });
  expect(archivedPresets.find(preset => preset.id === weekendStory!.id)).toMatchObject(canonicalWeekendStory);
});
