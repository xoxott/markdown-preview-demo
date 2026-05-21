/** 登录表单通用样式 class */
export const LOGIN_INPUT_CLASS = 'h-40px w-full';
export const LOGIN_CODE_BTN_CLASS = 'h-40px w-110px shrink-0 whitespace-nowrap text-12px';
export const LOGIN_PRIMARY_BTN_CLASS =
  'h-40px text-14px font-500 shadow-lg transition-all hover:shadow-xl';
export const LOGIN_ALT_BTN_CLASS = 'h-36px flex-1';

/** 风控风险因素 code → i18n 键（未知 code 原样展示） */
export const RISK_FACTOR_I18N: Record<string, App.I18n.I18nKey> = {
  new_or_untrusted_device: 'page.login.pwdLogin.riskFactorNewDevice',
  new_ip: 'page.login.pwdLogin.riskFactorNewIp'
};
