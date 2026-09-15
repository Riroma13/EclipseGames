// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { StudentCard } from './StudentCard';
import type { AvatarProfile, TeacherStudent } from './workspace-api';

const student: TeacherStudent = { id: 'student', groupId: 'group', realName: 'Ada Lovelace', alias: 'Ada', avatar: 'fox', specialty: null, archivedAt: null };
const savedProfile: AvatarProfile = { faceId: 'face-owl', skinToneId: 'skin-dark', hairId: 'hair-long', featureId: 'feature-glasses', clothingId: 'clothing-field', accessoryId: 'accessory-pin', frameId: 'frame-orbit', backgroundId: 'background-night' };

afterEach(() => { document.body.innerHTML = ''; });

describe('StudentCard avatar authority', () => {
  it('renders the saved Avatar Core profile instead of the legacy roster token', () => {
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    act(() => { root.render(<StudentCard student={student} avatarProfile={savedProfile} selected={false} onSelect={() => undefined} />); });
    expect(container.querySelector('.avatar-face-owl')).not.toBeNull();
    expect(container.querySelector('.avatar-face-fox')).toBeNull();
    root.unmount();
  });

  it('uses the legacy token only when no authoritative profile has entered the flow', () => {
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    act(() => { root.render(<StudentCard student={student} selected={false} onSelect={() => undefined} />); });
    expect(container.querySelector('.avatar-face-fox')).not.toBeNull();
    root.unmount();
  });
});
