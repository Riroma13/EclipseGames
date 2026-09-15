import type { AvatarProfile } from './workspace-api';

export function initialsForAvatar(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0]}`.toUpperCase() : (parts[0]?.slice(0, 2) || '·').toUpperCase();
}

const allowed = new Set(['face-human', 'face-fox', 'face-owl', 'face-cat', 'face-wolf', 'skin-light', 'skin-medium-light', 'skin-medium', 'skin-medium-dark', 'skin-dark', 'hair-none', 'hair-short', 'hair-curly', 'hair-long', 'feature-none', 'feature-glasses', 'feature-freckles', 'clothing-eclipse', 'clothing-field', 'accessory-none', 'accessory-pin', 'frame-none', 'frame-orbit', 'background-eclipse', 'background-night']);
const keys = ['faceId', 'skinToneId', 'hairId', 'featureId', 'clothingId', 'accessoryId', 'frameId', 'backgroundId'] as const;

export function isAvatarProfile(value: unknown): value is AvatarProfile {
  return Boolean(value && typeof value === 'object' && keys.every(key => typeof (value as Record<string, unknown>)[key] === 'string' && allowed.has((value as Record<string, string>)[key])));
}

export function AvatarPreview({ profile, initials, size = 'default' }: { profile: unknown; initials: string; size?: 'card' | 'default' }) {
  const valid = isAvatarProfile(profile);
  const classes = valid ? keys.map(key => `avatar-${profile[key]}`).join(' ') : 'avatar-invalid';
  return <span className={`avatar-preview avatar-preview-${size} ${classes}`} role="img" aria-label={valid ? 'Vista previa del avatar' : `Avatar no válido: ${initials}`}>
    {!valid ? <span className="avatar-fallback-initials">{initials}</span> : <><span className="avatar-layer avatar-background" /><span className="avatar-layer avatar-body" /><span className="avatar-layer avatar-face" /><span className="avatar-layer avatar-hair" /><span className="avatar-layer avatar-feature" /><span className="avatar-layer avatar-clothing" /><span className="avatar-layer avatar-accessory" /><span className="avatar-layer avatar-frame" /></>}
  </span>;
}
