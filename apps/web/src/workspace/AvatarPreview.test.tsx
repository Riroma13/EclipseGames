// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { AvatarPreview, isAvatarProfile } from './AvatarPreview';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const profile = { faceId:'face-fox', skinToneId:'skin-medium', hairId:'hair-none', featureId:'feature-none', clothingId:'clothing-eclipse', accessoryId:'accessory-none', frameId:'frame-none', backgroundId:'background-eclipse' };

describe('AvatarPreview', () => {
  it('renders the same semantic layer classes for the same profile', () => {
    const first = renderToStaticMarkup(createElement(AvatarPreview, { profile, initials: 'AL' }));
    expect(first).toBe(renderToStaticMarkup(createElement(AvatarPreview, { profile, initials: 'AL' })));
    expect(first).toContain('avatar-face-fox');
  });
  it('falls back to initials and reports invalid profile data', () => {
    expect(isAvatarProfile({ ...profile, faceId: 'unknown' })).toBe(false);
    expect(renderToStaticMarkup(createElement(AvatarPreview, { profile: { faceId: 'unknown' }, initials: 'AL' }))).toContain('Avatar no válido: AL');
  });
});
