import { clearRememberedUsername, saveRememberedUsername } from '@/store/modules/auth/shared';
import { calculateStringMD5 } from '@/hooks/upload/utils/hash';

/** 登录密码 MD5 后提交（与后端约定一致） */
export function encryptLoginPassword(password: string): string {
  return calculateStringMD5(password);
}

/** 根据「记住我」勾选状态写入或清除本地用户名 */
export function persistRememberedUsername(remember: boolean, username: string) {
  if (remember && username) {
    saveRememberedUsername(username);
  } else {
    clearRememberedUsername();
  }
}
