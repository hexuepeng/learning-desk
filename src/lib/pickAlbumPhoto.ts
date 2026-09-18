import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'library' | 'camera';

export type PhotoPickResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'permission' | 'canceled' };

export function photoPermissionCopy(source: PhotoSource): { title: string; body: string } {
  return {
    title: source === 'camera' ? '需要相机权限' : '需要相册权限',
    body: '相册书只把照片存在这台设备上，不会上传。',
  };
}

export async function pickDevicePhoto(source: PhotoSource): Promise<PhotoPickResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'permission' };
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return { ok: false, reason: 'canceled' };
    return { ok: true, uri: result.assets[0].uri };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission' };
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return { ok: false, reason: 'canceled' };
  return { ok: true, uri: result.assets[0].uri };
}
