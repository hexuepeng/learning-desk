import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const BACKUP_FILE_NAME = 'learning-desk-backup.json';

export async function writeBackupFile(json: string): Promise<string> {
  const root = FileSystem.documentDirectory;
  if (!root) throw new Error('这台设备没有可写的文档目录');
  const uri = `${root}${BACKUP_FILE_NAME}`;
  await FileSystem.writeAsStringAsync(uri, json);
  return uri;
}

export async function shareBackupText(json: string): Promise<boolean> {
  const result = await Share.share({
    title: '学习台备份',
    message: json,
  });
  return result.action !== Share.dismissedAction;
}
