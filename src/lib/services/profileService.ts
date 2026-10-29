import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export async function uploadUserAvatar(file: File): Promise<{
  success: boolean;
  avatarUrl?: string;
  error?: string;
}> {
  // 1. Client-side format & size validation
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      success: false,
      error: 'Invalid file format. Please upload a JPG, PNG, or WebP image.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: 'File size exceeds 5MB limit. Please choose a smaller photo.',
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required to update avatar.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

  let finalUrl: string = '';

  try {
    // 2. Try Supabase Storage upload
    const { data: storageData, error: storageError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (!storageError && storageData) {
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(storageData.path);
      finalUrl = publicUrlData.publicUrl;
    } else {
      console.warn('Storage bucket upload notice:', storageError?.message);
      // Fallback: If avatars bucket has not been configured in SQL Editor, convert to Data URL for instant persistence
      finalUrl = await fileToDataUrl(file);
    }
  } catch (err: any) {
    console.warn('Storage fallback triggered:', err?.message);
    finalUrl = await fileToDataUrl(file);
  }

  // 3. Persist new avatar URL strictly to auth.uid()'s profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      avatar_url: finalUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  return { success: true, avatarUrl: finalUrl };
}

export async function removeUserAvatar(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateUserProfile(input: {
  fullName?: string;
  avatarUrl?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Authentication required.' };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (input.fullName !== undefined) {
    updates.full_name = input.fullName.trim();
  }
  if (input.avatarUrl !== undefined) {
    updates.avatar_url = input.avatarUrl;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

