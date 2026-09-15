import type { AvatarHistoryDto, AvatarProfile, TeacherAvatarDto } from '@eclipse/contracts';
import { toTeacherAvatarDto, type AvatarXpFields } from './contracts.js';

type AvatarView = {
  studentId: string;
  alias: string;
  specialty: string | null;
  academicYearId: string;
  revision: number;
  profile: AvatarProfile;
  updatedAt: string;
  editable: boolean;
};

export function toTeacherAvatar(value: AvatarView, xp: AvatarXpFields): TeacherAvatarDto {
  return toTeacherAvatarDto(value, xp);
}

export function toAvatarHistory(value: {
  revision: number;
  operation: AvatarHistoryDto['operation'];
  revertedFromRevision: number | null;
  reason: string | null;
  actorTeacherId: string | null;
  createdAt: string;
  profile?: AvatarProfile;
  faceId?: AvatarProfile['faceId'];
  skinToneId?: AvatarProfile['skinToneId'];
  hairId?: AvatarProfile['hairId'];
  featureId?: AvatarProfile['featureId'];
  clothingId?: AvatarProfile['clothingId'];
  accessoryId?: AvatarProfile['accessoryId'];
  frameId?: AvatarProfile['frameId'];
  backgroundId?: AvatarProfile['backgroundId'];
}): AvatarHistoryDto {
  const profile = value.profile ?? {
    faceId: value.faceId!, skinToneId: value.skinToneId!, hairId: value.hairId!,
    featureId: value.featureId!, clothingId: value.clothingId!, accessoryId: value.accessoryId!,
    frameId: value.frameId!, backgroundId: value.backgroundId!,
  };
  return {
    revision: value.revision,
    operation: value.operation,
    revertedFromRevision: value.revertedFromRevision,
    reason: value.reason,
    actorTeacherId: value.actorTeacherId,
    createdAt: value.createdAt,
    profile,
  };
}
