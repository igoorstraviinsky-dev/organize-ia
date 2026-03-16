import { Profile } from '../types/models';
import { supabase } from '../lib/supabase';

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const payload = { id: userId, ...updates };

  const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single();

  if (error) {
    throw error;
  }

  return data as Profile;
}

export async function uploadAvatar(userId: string, imageUri: string) {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, arrayBuffer, {
    contentType: blob.type || `image/${fileExt}`,
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath);

  await updateProfile(userId, { avatar_url: publicUrl });

  return publicUrl;
}
