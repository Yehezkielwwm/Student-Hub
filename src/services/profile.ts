import { db } from '@/db'
import type { Preferences, Profile } from '@/types/models'
import { nowISO } from '@/lib/utils'
import { MAX_FILE_SIZE } from '@/lib/files'

const PROFILE_ID = 'me'

export async function getProfile() {
  return db.profile.get(PROFILE_ID)
}

export async function updateProfile(patch: { name?: string; avatarAssetId?: string | null }) {
  const timestamp = nowISO()
  if (patch.avatarAssetId !== undefined) {
    await db.profile.update(PROFILE_ID, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      avatarAssetId: patch.avatarAssetId ?? undefined,
      updatedAt: timestamp,
    })
  } else {
    await db.profile.update(PROFILE_ID, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      updatedAt: timestamp,
    })
  }
}

export async function updatePreferences(patch: Partial<Preferences>) {
  const profile = await db.profile.get(PROFILE_ID)
  if (!profile) return
  const next: Profile = {
    ...profile,
    prefs: { ...profile.prefs, ...patch },
    updatedAt: nowISO(),
  }
  await db.profile.put(next)
}

export async function setAvatar(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Foto profil harus berupa gambar.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran foto profil maksimal 25 MB.')
  }
  const profile = await db.profile.get(PROFILE_ID)
  if (!profile) throw new Error('Profil tidak ditemukan.')
  const assetId = `avatar-${Date.now()}`
  await db.transaction('rw', db.assets, db.profile, async () => {
    await db.assets.put({ id: assetId, blob: file, mime: file.type, createdAt: nowISO() })
    await db.profile.update(PROFILE_ID, { avatarAssetId: assetId, updatedAt: nowISO() })
    if (profile.avatarAssetId) {
      await db.assets.delete(profile.avatarAssetId)
    }
  })
}

export async function removeAvatar() {
  const profile = await db.profile.get(PROFILE_ID)
  if (!profile) return
  await db.transaction('rw', db.assets, db.profile, async () => {
    if (profile.avatarAssetId) await db.assets.delete(profile.avatarAssetId)
    await db.profile.update(PROFILE_ID, { avatarAssetId: undefined, updatedAt: nowISO() })
  })
}
