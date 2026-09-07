import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';

/**
 * Profile photo (the "profile logo").
 *
 * The user can take or pick their own photo; it is compressed, square-cropped
 * on native, and stored inside the app's document directory so it survives
 * app restarts. On web there is no stable file store, so the compressed
 * image is stored as a data URI instead.
 *
 * Uses the SDK 55+ curated file-system API (File / Paths). The old
 * `expo-file-system/legacy` module was removed in SDK 55.
 */

const BASE64_PREFIX = 'data:image/jpeg;base64,';

function avatarFile(timestamp: number): File | null {
  if (Platform.OS === 'web') return null;
  return new File(Paths.document, `avatar-${timestamp}.jpg`);
}

/** Only we ever delete files that live in our own avatar spot. */
async function removeStoredAvatar(uri: string | null | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(Paths.document.uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* already gone — fine */
  }
}

async function pick(source: 'library' | 'camera'): Promise<ImagePicker.ImagePickerResult | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera off', 'Allow camera access to take a photo, or pick one from your library.');
      return null;
    }
    return ImagePicker.launchCameraAsync({
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
      ...(Platform.OS === 'web' ? { base64: true } : {}),
    });
  }
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    quality: 0.7,
    // Lets the user square-crop on the device — the result stays clean and
    // soft instead of being squashed into the circle.
    allowsEditing: Platform.OS !== 'web',
    ...(Platform.OS === 'web' ? { base64: true } : {}),
  });
}

/**
 * Ask for a photo, store it, and return the persistent URI — or null if the
 * user cancelled, denied permission, or something went wrong.
 */
export async function pickAndStoreAvatarPhoto(
  source: 'library' | 'camera',
  previousUri?: string | null
): Promise<string | null> {
  try {
    const result = await pick(source);
    if (!result || result.canceled || !result.assets || result.assets.length === 0) return null;
    const asset = result.assets[0];

    if (Platform.OS === 'web') {
      if (asset.base64) return BASE64_PREFIX + asset.base64;
      return null;
    }

    const dest = avatarFile(Date.now());
    if (!dest) return asset.uri ?? null;
    const picked = new File(asset.uri ?? '');
    await picked.copy(dest, { overwrite: true });
    await removeStoredAvatar(previousUri);
    return dest.uri;
  } catch (e) {
    console.warn('[avatar] could not store photo', e);
    return null;
  }
}

/**
 * Shows the choice sheet: photo library, camera, and (when a photo is set)
 * remove. `onChoice` receives the choice, or null for cancel.
 */
export function chooseAvatarAction(hasPhoto: boolean, onChoice: (c: 'library' | 'camera' | 'remove' | null) => void) {
  const actions = [
    { text: 'Choose from photo library', onPress: () => onChoice('library') },
    { text: 'Take a photo', onPress: () => onChoice('camera') },
    ...(hasPhoto ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => onChoice('remove') }] : []),
    { text: 'Cancel', style: 'cancel' as const },
  ];
  Alert.alert('Your photo', 'Pick a picture of yourself for your profile.', actions);
}
