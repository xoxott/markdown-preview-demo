import { useAuthStore } from '@/store/modules/auth';
import { localStg } from '@/utils/storage';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';
import { sseManager } from '@/utils/sse/SSEManager';

export function getAuthorization() {
  const token = localStg.get('token') || localStg.get('accessToken');
  const Authorization = token ? `Bearer ${token}` : null;

  return Authorization;
}

/** refresh token */
async function handleRefreshToken() {
  const { resetStore } = useAuthStore();

  const rToken = localStg.get('refreshToken') || '';
  
  if (!rToken) {
    console.error('[Token Refresh] Refresh token 不存在，无法刷新');
    resetStore();
    return false;
  }

  console.log('[Token Refresh] 开始调用刷新 token API');
  try {
    const { error, data } = await fetchRefreshToken(rToken);
    
    if (error) {
      console.error('[Token Refresh] 刷新 token 失败:', error);
      if (error.response?.data) {
        const errorData = error.response.data as unknown as Api.ErrorResponse;
        console.error('[Token Refresh] 错误详情:', {
          code: errorData.code,
          message: errorData.message,
          details: errorData.details
        });
      }
      resetStore();
      return false;
    }

    if (!data) {
      console.error('[Token Refresh] 刷新 token 返回数据为空');
      resetStore();
      return false;
    }

    // 保存新的 token
    localStg.set('token', data.accessToken);
    localStg.set('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStg.set('refreshToken', data.refreshToken);
    }
    
    console.log('[Token Refresh] Token 刷新成功');
    
    // Update SSE connections with new token
    const newToken = data.accessToken;
    if (newToken) {
      const authorization = `Bearer ${newToken}`;
      sseManager.updateAllHeaders({ Authorization: authorization }, true);
      console.log('[Token Refresh] SSE connections updated with new token');
    }
    
    return true;
  } catch (err) {
    console.error('[Token Refresh] 刷新 token 异常:', err);
    resetStore();
    return false;
  }
}

export async function handleExpiredRequest(state: RequestInstanceState) {
  // 如果已经有正在进行的刷新请求，等待它完成（避免并发刷新）
  if (!state.refreshTokenFn) {
    console.log('[Token Refresh] 创建新的刷新 token 请求');
    state.refreshTokenFn = handleRefreshToken();
  } else {
    console.log('[Token Refresh] 等待正在进行的刷新 token 请求完成');
  }

  const success = await state.refreshTokenFn;

  // 延迟清理，确保所有并发请求都能共享同一个刷新结果
  setTimeout(() => {
    state.refreshTokenFn = null;
  }, 1000);

  return success;
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
