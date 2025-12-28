/** The storage namespace */
declare namespace StorageType {
  interface Session {
    /** The theme color */
    themeColor: string;
    // /**
    //  * the theme settings
    //  */
    // themeSettings: App.Theme.ThemeSetting;
  }

  interface Local {
    /** The i18n language */
    lang: App.I18n.LangType;
    /** The token */
    token: string;
    /** Fixed sider with mix-menu */
    mixSiderFixed: CommonType.YesOrNo;
    /** The refresh token */
    refreshToken: string;
    /** The access token */
    accessToken: string;
    /** The temporary token */
    temporaryToken: string;
    /** The theme color */
    themeColor: string;
    /** The dark mode */
    darkMode: boolean;
    /** The theme settings */
    themeSettings: App.Theme.ThemeSetting;
    /**
     * The override theme flags
     *
     * The value is the build time of the project
     */
    overrideThemeFlag: string;
    /** The global tabs */
    globalTabs: App.Global.Tab[];
    /** The backup theme setting before is mobile */
    backupThemeSettingBeforeIsMobile: {
      layout: UnionKey.ThemeLayoutMode;
      siderCollapse: boolean;
    };
    /** The last login user id */
    lastLoginUserId: string;
    /** Remember me option state */
    rememberMe?: boolean;
    /** Saved username for remember me feature */
    savedUsername?: string;
  }

  /**
   * Workflow UI cache storage
   *
   * Dynamic keys for workflow UI data
   * Key format: `workflow_ui_{workflowId}`
   */
  interface WorkflowUICache {
    [key: `workflow_ui_${string}`]: {
      workflowId: string;
      nodesUI: Record<string, any>;
      connectionsUI: Record<string, any>;
      canvasConfig?: Record<string, any>;
      lastUpdated: number;
    };
  }

  // Merge WorkflowUICache into Local
  interface Local extends WorkflowUICache {}
}
