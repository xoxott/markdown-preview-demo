import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import {
  fetchGetUserInfo,
  fetchLoginStep1,
  fetchLoginStep2,
  fetchRegister,
  fetchSendRegistrationCode,
  fetchRefreshToken,
  fetchLogout
} from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage, getToken } from './shared';

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref(getToken());

  const userInfo: Api.Auth.UserInfo = reactive({
    id: 0,
    username: '',
    email: '',
    avatar: null,
    role: '',
    roles: [],
    buttons: [],
    isActive: false,
    lastLoginAt: '',
    lastActivityAt: '',
    isOnline: false,
    createdAt: '',
    updatedAt: ''
  });

  /** Get role codes as string array for compatibility */
  const roleCodes = computed(() => {
    return userInfo.roles?.map(role => role.code) || [];
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && roleCodes.value.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Get user ID as string for compatibility */
  const userId = computed(() => String(userInfo.id || ''));

  /** Get user name for compatibility */
  const userName = computed(() => userInfo.username || '');

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    const authStore = useAuthStore();

    recordUserId();

    // Call logout API if user is logged in
    if (token.value) {
      try {
        await fetchLogout();
      } catch (error) {
        // Ignore logout errors, continue with cleanup
        console.error('Logout API error:', error);
      }
    }

    clearAuthStorage();

    authStore.$reset();

    if (!route.meta.constant) {
      await toLogin();
    }

    tabStore.cacheTabs();
    routeStore.resetStore();
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.id) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', String(userInfo.id));
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.id) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');
    const currentUserId = String(userInfo.id);

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== currentUserId) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * Login step 1 - Initial login with username and password
   *
   * @param username Username
   * @param password Password
   * @returns Login step 1 response (may require verification)
   */
  async function loginStep1(username: string, password: string) {
    startLoading();
    const { data, error } = await fetchLoginStep1(username, password);
    endLoading();

    if (error || !data) {
      return { success: false, requiresVerification: false, data: null };
    }

    // If verification is not required, complete login immediately
    if (!data.requiresVerification) {
      const loginToken: Api.Auth.LoginToken = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      };

      const pass = await loginByToken(loginToken);

      if (pass) {
        const isClear = checkTabClear();
        await redirectFromLogin(!isClear);

        window.$notification?.success({
          title: $t('page.login.common.loginSuccess'),
          content: $t('page.login.common.welcomeBack', { userName: userInfo.username }),
          duration: 4500
        });

        return { success: true, requiresVerification: false, data: null };
      }

      return { success: false, requiresVerification: false, data: null };
    }

    // Verification is required, return temporary token and risk info
    return {
      success: true,
      requiresVerification: true,
      data: {
        temporaryToken: data.temporaryToken,
        riskScore: data.riskScore,
        riskFactors: data.riskFactors,
        expiresIn: data.expiresIn,
        message: data.message
      }
    };
  }

  /**
   * Login step 2 - Verify code with temporary token
   *
   * @param temporaryToken Temporary token from step 1
   * @param code Verification code
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function loginStep2(temporaryToken: string, code: string, redirect = true) {
    startLoading();
    const { data, error } = await fetchLoginStep2(temporaryToken, code);
    endLoading();

    if (error || !data) {
      return false;
    }

    const loginToken: Api.Auth.LoginToken = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn
    };

    // Update user info from response
    // Extract role codes from roles array for compatibility
    const roleCodes = data.user.roles?.map(role => role.code) || [];
    const firstRoleCode = roleCodes[0] || '';

    Object.assign(userInfo, {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      avatar: data.user.avatar,
      isActive: data.user.isActive,
      lastLoginAt: data.user.lastLoginAt,
      lastActivityAt: data.user.lastActivityAt,
      isOnline: data.user.isOnline,
      createdAt: data.user.createdAt,
      updatedAt: data.user.updatedAt,
      roles: data.user.roles,
      role: firstRoleCode,
      buttons: data.user.buttons || []
    });

    // Skip getUserInfo since we already have user info from login response
    const pass = await loginByToken(loginToken, true);

    if (pass) {
      const isClear = checkTabClear();
      await redirectFromLogin(!isClear && redirect);

      window.$notification?.success({
        title: $t('page.login.common.loginSuccess'),
        content: $t('page.login.common.welcomeBack', { userName: userInfo.username }),
        duration: 4500
      });

      return true;
    }

    return false;
  }

  /**
   * Register new user
   *
   * @param username Username
   * @param email Email
   * @param password Password
   * @param verificationCode Verification code
   */
  async function register(username: string, email: string, password: string, verificationCode: string) {
    startLoading();
    const { data, error } = await fetchRegister(username, email, password, verificationCode);
    endLoading();

    if (error || !data) {
      return false;
    }

    window.$message?.success(data.message || '注册成功');

    return true;
  }

  /**
   * Send registration verification code
   *
   * @param email Email address
   */
  async function sendRegistrationCode(email: string) {
    const { data, error } = await fetchSendRegistrationCode(email);

    if (error || !data) {
      return false;
    }

    window.$message?.success(data.message || '验证码已发送');

    return true;
  }

  async function loginByToken(loginToken: Api.Auth.LoginToken, skipGetUserInfo = false) {
    // 1. stored in the localStorage, the later requests need it in headers
    localStg.set('token', loginToken.accessToken);
    localStg.set('refreshToken', loginToken.refreshToken);

    // 2. get user info (if not already set from login response)
    // Skip if user info is already set (e.g., from loginStep2 response) or explicitly skipped
    if (!skipGetUserInfo && !userInfo.id && !userInfo.username) {
      const pass = await getUserInfo();

      if (pass) {
        token.value = loginToken.accessToken;
        return true;
      }

      return false;
    }

    token.value = loginToken.accessToken;
    return true;
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo();

    if (!error && info) {
      // Extract role codes from roles array for compatibility
      const roleCodes = info.roles?.map(role => role.code) || [];
      const firstRoleCode = roleCodes[0] || '';

      // Map new API structure to userInfo
      Object.assign(userInfo, {
        id: info.id,
        username: info.username,
        email: info.email,
        avatar: info.avatar,
        isActive: info.isActive,
        lastLoginAt: info.lastLoginAt,
        lastActivityAt: info.lastActivityAt,
        isOnline: info.isOnline,
        createdAt: info.createdAt,
        updatedAt: info.updatedAt,
        roles: info.roles, // Keep full roles array
        role: firstRoleCode, // Set first role code for compatibility
        buttons: info.buttons || [] // Set default empty array if not provided
      });

      return true;
    }

    return false;
  }

  // Flag to prevent duplicate getUserInfo calls
  let isGettingUserInfo = false;

  async function initUserInfo() {
    const hasToken = getToken();

    if (!hasToken) {
      return;
    }

    // If user info is already loaded, skip
    if (userInfo.id && userInfo.username) {
      return;
    }

    // Prevent duplicate calls
    if (isGettingUserInfo) {
      return;
    }

    isGettingUserInfo = true;

    try {
      const pass = await getUserInfo();

      if (!pass) {
        resetStore();
      }
    } finally {
      isGettingUserInfo = false;
    }
  }

  return {
    token,
    userInfo,
    userId,
    userName,
    roleCodes,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    loginStep1,
    loginStep2,
    register,
    sendRegistrationCode,
    initUserInfo
  };
});
