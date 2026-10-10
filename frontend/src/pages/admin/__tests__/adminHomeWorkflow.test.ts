import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_HOMEPAGE_SETTINGS, type HomepageSettings } from '../../../hooks/useHomepage';
import { cleanFirestorePayload } from '../../../utils/cleanFirestorePayload';
import type { StorefrontConfig } from '../../../types/settingsConfig';

describe('AdminHome Video Toggle & Save Workflow (Simulated Component Flow)', () => {
  it('verifies initial state has enableVideo true, toggling to false produces draft false, and save handler passes boolean false', async () => {
    // 1. Initial state as loaded from Firestore / DEFAULT_HOMEPAGE_SETTINGS
    let form: HomepageSettings = {
      ...DEFAULT_HOMEPAGE_SETTINGS,
      hero: {
        ...DEFAULT_HOMEPAGE_SETTINGS.hero,
        enableVideo: true,
        heroVideoUrl: '/videos/demo_video2.mp4',
        heroImageUrl: '',
      },
      featuredProductIds: ['prod-1', 'prod-2'],
    };

    expect(form.hero?.enableVideo).toBe(true);

    // 2. Simulate "✕ Disable Video" button click handler in AdminHome.tsx:
    // onClick={() => setForm((current) => ({ ...current, hero: { ...(current.hero || DEFAULT_HOMEPAGE_SETTINGS.hero), enableVideo: false } }))}
    const handleDisableVideoClick = () => {
      form = {
        ...form,
        hero: {
          ...(form.hero || DEFAULT_HOMEPAGE_SETTINGS.hero),
          enableVideo: false,
        },
      };
    };

    handleDisableVideoClick();

    // Confirm displayed draft state becomes false
    expect(form.hero?.enableVideo).toBe(false);

    // 3. Mock the Firestore mutation function (simulating updateHomepage.mutateAsync)
    let capturedMutationArg: StorefrontConfig | null = null;
    const mutateAsyncMock = vi.fn(async (payload: StorefrontConfig) => {
      capturedMutationArg = payload;
      // In useUpdateHomepage:
      const processed: StorefrontConfig = {
        ...payload,
        hero: {
          ...payload.hero,
          enableVideo: payload.hero.enableVideo === true,
        },
        updatedAt: '2026-10-10T10:00:00.000Z',
        updatedBy: 'mock-admin-uid',
      };
      return cleanFirestorePayload(processed);
    });

    // 4. Simulate handleSave in AdminHome.tsx:
    const activeProducts = [{ id: 'prod-1' }, { id: 'prod-2' }];
    let showSuccess = false;
    let saving = true;

    try {
      const persisted = await mutateAsyncMock({
        ...form,
        hero: {
          ...(form.hero || DEFAULT_HOMEPAGE_SETTINGS.hero),
          enableVideo: form.hero?.enableVideo === true,
        },
        featuredProductIds: form.featuredProductIds.filter((id) =>
          activeProducts.some((product) => product.id === id)
        ),
      });

      showSuccess = true;

      // 5. Verify the captured payload passed to the mutation
      expect(capturedMutationArg).not.toBeNull();
      expect(capturedMutationArg!.hero.enableVideo).toBe(false);
      expect(typeof capturedMutationArg!.hero.enableVideo).toBe('boolean');

      // 6. Verify the persisted result cleaned for Firestore
      expect(persisted.hero.enableVideo).toBe(false);
      expect(typeof persisted.hero.enableVideo).toBe('boolean');
      expect(persisted.hero.heroImageUrl).toBe('');
      expect(persisted.hero.heroVideoUrl).toBe('/videos/demo_video2.mp4');
      expect(persisted.featuredProductIds).toEqual(['prod-1', 'prod-2']);
      expect(persisted.updatedBy).toBe('mock-admin-uid');
    } finally {
      saving = false;
    }

    expect(showSuccess).toBe(true);
    expect(saving).toBe(false);
  });

  it('verifies toggling from false to true produces draft true and saves boolean true', async () => {
    let form: HomepageSettings = {
      ...DEFAULT_HOMEPAGE_SETTINGS,
      hero: {
        ...DEFAULT_HOMEPAGE_SETTINGS.hero,
        enableVideo: false,
        heroVideoUrl: '/videos/demo_video2.mp4',
        heroImageUrl: '',
      },
      featuredProductIds: ['prod-1'],
    };

    expect(form.hero?.enableVideo).toBe(false);

    // Simulate "✓ Enable Video" button click handler in AdminHome.tsx:
    const handleEnableVideoClick = () => {
      form = {
        ...form,
        hero: {
          ...(form.hero || DEFAULT_HOMEPAGE_SETTINGS.hero),
          enableVideo: true,
        },
      };
    };

    handleEnableVideoClick();
    expect(form.hero?.enableVideo).toBe(true);

    let capturedMutationArg: StorefrontConfig | null = null;
    const mutateAsyncMock = vi.fn(async (payload: StorefrontConfig) => {
      capturedMutationArg = payload;
      const processed: StorefrontConfig = {
        ...payload,
        hero: {
          ...payload.hero,
          enableVideo: payload.hero.enableVideo === true,
        },
        updatedAt: '2026-10-10T10:00:00.000Z',
      };
      return cleanFirestorePayload(processed);
    });

    const activeProducts = [{ id: 'prod-1' }];
    const persisted = await mutateAsyncMock({
      ...form,
      hero: {
        ...(form.hero || DEFAULT_HOMEPAGE_SETTINGS.hero),
        enableVideo: form.hero?.enableVideo === true,
      },
      featuredProductIds: form.featuredProductIds.filter((id) =>
        activeProducts.some((product) => product.id === id)
      ),
    });

    expect(capturedMutationArg).not.toBeNull();
    expect(capturedMutationArg!.hero.enableVideo).toBe(true);
    expect(typeof capturedMutationArg!.hero.enableVideo).toBe('boolean');
    expect(persisted.hero.enableVideo).toBe(true);
    expect(persisted.hero.heroImageUrl).toBe('');
  });

  it('verifies error handling: does not show success if mutation rejects', async () => {
    const form: HomepageSettings = {
      ...DEFAULT_HOMEPAGE_SETTINGS,
      hero: {
        ...DEFAULT_HOMEPAGE_SETTINGS.hero,
        enableVideo: false,
      },
    };

    const mutateAsyncMock = vi.fn(async (_payload: StorefrontConfig) => {
      throw new Error('Permission denied or network failure');
    });

    let showSuccess = false;
    let errorMessage = '';

    try {
      await mutateAsyncMock({
        ...form,
        hero: {
          ...(form.hero || DEFAULT_HOMEPAGE_SETTINGS.hero),
          enableVideo: form.hero?.enableVideo === true,
        },
        featuredProductIds: [],
      });
      showSuccess = true;
    } catch (err: any) {
      errorMessage = err.message;
    }

    expect(showSuccess).toBe(false);
    expect(errorMessage).toBe('Permission denied or network failure');
  });
});
