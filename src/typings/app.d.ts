/** The global namespace for the app */
declare namespace App {
  /** Theme namespace */
  namespace Theme {
    type ColorPaletteNumber = import('@sa/color').ColorPaletteNumber;

    /** Theme setting */
    interface ThemeSetting {
      /** Theme scheme */
      themeScheme: UnionKey.ThemeScheme;
      /** grayscale mode */
      grayscale: boolean;
      /** colour weakness mode */
      colourWeakness: boolean;
      /** Whether to recommend color */
      recommendColor: boolean;
      /** Theme color */
      themeColor: string;
      /** Other color */
      otherColor: OtherColor;
      /** Whether info color is followed by the primary color */
      isInfoFollowPrimary: boolean;
      /** Reset cache strategy */
      resetCacheStrategy: UnionKey.ResetCacheStrategy;
      /** Layout */
      layout: {
        /** Layout mode */
        mode: UnionKey.ThemeLayoutMode;
        /** Scroll mode */
        scrollMode: UnionKey.ThemeScrollMode;
        /**
         * Whether to reverse the horizontal mix
         *
         * if true, the vertical child level menus in left and horizontal first level menus in top
         */
        reverseHorizontalMix: boolean;
      };
      /** Page */
      page: {
        /** Whether to show the page transition */
        animate: boolean;
        /** Page animate mode */
        animateMode: UnionKey.ThemePageAnimateMode;
      };
      /** Header */
      header: {
        /** Header height */
        height: number;
        /** Header breadcrumb */
        breadcrumb: {
          /** Whether to show the breadcrumb */
          visible: boolean;
          /** Whether to show the breadcrumb icon */
          showIcon: boolean;
        };
        /** Multilingual */
        multilingual: {
          /** Whether to show the multilingual */
          visible: boolean;
        };
      };
      /** Tab */
      tab: {
        /** Whether to show the tab */
        visible: boolean;
        /**
         * Whether to cache the tab
         *
         * If cache, the tabs will get from the local storage when the page is refreshed
         */
        cache: boolean;
        /** Tab height */
        height: number;
        /** Tab mode */
        mode: UnionKey.ThemeTabMode;
      };
      /** Fixed header and tab */
      fixedHeaderAndTab: boolean;
      /** Sider */
      sider: {
        /** Inverted sider */
        inverted: boolean;
        /** Sider width */
        width: number;
        /** Collapsed sider width */
        collapsedWidth: number;
        /** Sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixWidth: number;
        /** Collapsed sider width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixCollapsedWidth: number;
        /** Child menu width when the layout is 'vertical-mix' or 'horizontal-mix' */
        mixChildMenuWidth: number;
      };
      /** Footer */
      footer: {
        /** Whether to show the footer */
        visible: boolean;
        /** Whether fixed the footer */
        fixed: boolean;
        /** Footer height */
        height: number;
        /** Whether float the footer to the right when the layout is 'horizontal-mix' */
        right: boolean;
      };
      /** Watermark */
      watermark: {
        /** Whether to show the watermark */
        visible: boolean;
        /** Watermark text */
        text: string;
      };
      /** define some theme settings tokens, will transform to css variables */
      tokens: {
        light: ThemeSettingToken;
        dark?: {
          [K in keyof ThemeSettingToken]?: Partial<ThemeSettingToken[K]>;
        };
      };
    }

    interface OtherColor {
      info: string;
      success: string;
      warning: string;
      error: string;
    }

    interface ThemeColor extends OtherColor {
      primary: string;
    }

    type ThemeColorKey = keyof ThemeColor;

    type ThemePaletteColor = {
      [key in ThemeColorKey | `${ThemeColorKey}-${ColorPaletteNumber}`]: string;
    };

    type BaseToken = Record<string, Record<string, string>>;

    interface ThemeSettingTokenColor {
      /** the progress bar color, if not set, will use the primary color */
      nprogress?: string;
      container: string;
      layout: string;
      inverted: string;
      'base-text': string;
    }

    interface ThemeSettingTokenBoxShadow {
      header: string;
      sider: string;
      tab: string;
    }

    interface ThemeSettingToken {
      colors: ThemeSettingTokenColor;
      boxShadow: ThemeSettingTokenBoxShadow;
    }

    type ThemeTokenColor = ThemePaletteColor & ThemeSettingTokenColor;

    /** Theme token CSS variables */
    type ThemeTokenCSSVars = {
      colors: ThemeTokenColor & { [key: string]: string };
      boxShadow: ThemeSettingTokenBoxShadow & { [key: string]: string };
    };
  }

  /** Global namespace */
  namespace Global {
    type VNode = import('vue').VNode;
    type RouteLocationNormalizedLoaded = import('vue-router').RouteLocationNormalizedLoaded;
    type RouteKey = import('@elegant-router/types').RouteKey;
    type RouteMap = import('@elegant-router/types').RouteMap;
    type RoutePath = import('@elegant-router/types').RoutePath;
    type LastLevelRouteKey = import('@elegant-router/types').LastLevelRouteKey;

    /** The router push options */
    type RouterPushOptions = {
      query?: Record<string, string>;
      params?: Record<string, string>;
    };

    /** The global header props */
    interface HeaderProps {
      /** Whether to show the logo */
      showLogo?: boolean;
      /** Whether to show the menu toggler */
      showMenuToggler?: boolean;
      /** Whether to show the menu */
      showMenu?: boolean;
    }

    /** The global menu */
    type Menu = {
      /**
       * The menu key
       *
       * Equal to the route key
       */
      key: string;
      /** The menu label */
      label: string;
      /** The menu i18n key */
      i18nKey?: I18n.I18nKey | null;
      /** The route key */
      routeKey: RouteKey;
      /** The route path */
      routePath: RoutePath;
      /** The menu icon */
      icon?: () => VNode;
      /** The menu children */
      children?: Menu[];
    };

    type Breadcrumb = Omit<Menu, 'children'> & {
      options?: Breadcrumb[];
    };

    /** Tab route */
    type TabRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'path' | 'meta'> &
      Partial<Pick<RouteLocationNormalizedLoaded, 'fullPath' | 'query' | 'matched'>>;

    /** The global tab */
    type Tab = {
      /** The tab id */
      id: string;
      /** The tab label */
      label: string;
      /**
       * The new tab label
       *
       * If set, the tab label will be replaced by this value
       */
      newLabel?: string;
      /**
       * The old tab label
       *
       * when reset the tab label, the tab label will be replaced by this value
       */
      oldLabel?: string;
      /** The tab route key */
      routeKey: LastLevelRouteKey;
      /** The tab route path */
      routePath: RouteMap[LastLevelRouteKey];
      /** The tab route full path */
      fullPath: string;
      /** The tab fixed index */
      fixedIndex?: number | null;
      /**
       * Tab icon
       *
       * Iconify icon
       */
      icon?: string;
      /**
       * Tab local icon
       *
       * Local icon
       */
      localIcon?: string;
      /** I18n key */
      i18nKey?: I18n.I18nKey | null;
    };

    /** Form rule */
    type FormRule = import('naive-ui').FormItemRule;

    /** The global dropdown key */
    type DropdownKey = 'closeCurrent' | 'closeOther' | 'closeLeft' | 'closeRight' | 'closeAll';
  }

  /**
   * I18n namespace
   *
   * Locales type
   */
  namespace I18n {
    type RouteKey = import('@elegant-router/types').RouteKey;

    type LangType = 'en-US' | 'zh-CN';

    type LangOption = {
      label: string;
      key: LangType;
    };

    type I18nRouteKey = Exclude<RouteKey, 'root' | 'not-found'>;

    type FormMsg = {
      required: string;
      invalid: string;
    };

    type Schema = {
      system: {
        title: string;
        updateTitle: string;
        updateContent: string;
        updateConfirm: string;
        updateCancel: string;
      };
      common: {
        action: string;
        add: string;
        addSuccess: string;
        backToHome: string;
        batchDelete: string;
        cancel: string;
        close: string;
        check: string;
        expandColumn: string;
        columnSetting: string;
        config: string;
        confirm: string;
        delete: string;
        deleteSuccess: string;
        confirmDelete: string;
        edit: string;
        warning: string;
        error: string;
        index: string;
        keywordSearch: string;
        logout: string;
        logoutConfirm: string;
        lookForward: string;
        modify: string;
        modifySuccess: string;
        noData: string;
        operate: string;
        pleaseCheckValue: string;
        refresh: string;
        reset: string;
        search: string;
        switch: string;
        tip: string;
        trigger: string;
        update: string;
        updateSuccess: string;
        userCenter: string;
        view: string;
        yesOrNo: {
          yes: string;
          no: string;
        };
      };
      request: {
        logout: string;
        logoutMsg: string;
        logoutWithModal: string;
        logoutWithModalMsg: string;
        refreshToken: string;
        tokenExpired: string;
      };
      theme: {
        themeSchema: { title: string } & Record<UnionKey.ThemeScheme, string>;
        grayscale: string;
        colourWeakness: string;
        layoutMode: { title: string; reverseHorizontalMix: string } & Record<UnionKey.ThemeLayoutMode, string>;
        recommendColor: string;
        recommendColorDesc: string;
        themeColor: {
          title: string;
          followPrimary: string;
        } & Theme.ThemeColor;
        scrollMode: { title: string } & Record<UnionKey.ThemeScrollMode, string>;
        page: {
          animate: string;
          mode: { title: string } & Record<UnionKey.ThemePageAnimateMode, string>;
        };
        fixedHeaderAndTab: string;
        header: {
          height: string;
          breadcrumb: {
            visible: string;
            showIcon: string;
          };
          multilingual: {
            visible: string;
          };
        };
        tab: {
          visible: string;
          cache: string;
          height: string;
          mode: { title: string } & Record<UnionKey.ThemeTabMode, string>;
        };
        sider: {
          inverted: string;
          width: string;
          collapsedWidth: string;
          mixWidth: string;
          mixCollapsedWidth: string;
          mixChildMenuWidth: string;
        };
        footer: {
          visible: string;
          fixed: string;
          height: string;
          right: string;
        };
        watermark: {
          visible: string;
          text: string;
        };
        themeDrawerTitle: string;
        pageFunTitle: string;
        resetCacheStrategy: { title: string } & Record<UnionKey.ResetCacheStrategy, string>;
        configOperation: {
          copyConfig: string;
          copySuccessMsg: string;
          resetConfig: string;
          resetSuccessMsg: string;
        };
      };
      route: Record<I18nRouteKey, string>;
      page: {
        login: {
          common: {
            loginOrRegister: string;
            userNamePlaceholder: string;
            phonePlaceholder: string;
            codePlaceholder: string;
            passwordPlaceholder: string;
            confirmPasswordPlaceholder: string;
            codeLogin: string;
            confirm: string;
            back: string;
            validateSuccess: string;
            loginSuccess: string;
            welcomeBack: string;
          };
          pwdLogin: {
            title: string;
            rememberMe: string;
            forgetPassword: string;
            register: string;
            otherAccountLogin: string;
            otherLoginMode: string;
            superAdmin: string;
            admin: string;
            user: string;
          };
          codeLogin: {
            title: string;
            getCode: string;
            reGetCode: string;
            sendCodeSuccess: string;
            imageCodePlaceholder: string;
          };
          register: {
            title: string;
            agreement: string;
            protocol: string;
            policy: string;
          };
          resetPwd: {
            title: string;
          };
          bindWeChat: {
            title: string;
          };
        };
        home: {
          branchDesc: string;
          greeting: string;
          weatherDesc: string;
          projectCount: string;
          todo: string;
          message: string;
          downloadCount: string;
          registerCount: string;
          schedule: string;
          study: string;
          work: string;
          rest: string;
          entertainment: string;
          visitCount: string;
          turnover: string;
          dealCount: string;
          projectNews: {
            title: string;
            moreNews: string;
            desc1: string;
            desc2: string;
            desc3: string;
            desc4: string;
            desc5: string;
          };
          creativity: string;
        };
        userManagement: {
          title: string;
          username: string;
          email: string;
          role: string;
          status: string;
          onlineStatus: string;
          blacklistStatus: string;
          createdAt: string;
          lastLoginAt: string;
          active: string;
          inactive: string;
          online: string;
          offline: string;
          blacklisted: string;
          notBlacklisted: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          onlineStatusPlaceholder: string;
          blacklistStatusPlaceholder: string;
          rolePlaceholder: string;
          roleRequired: string;
          passwordPlaceholder: string;
          passwordPlaceholderEdit: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectUsersToDelete: string;
          getDetailFailed: string;
        };
        roleManagement: {
          title: string;
          name: string;
          code: string;
          description: string;
          status: string;
          createdAt: string;
          updatedAt: string;
          active: string;
          inactive: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          namePlaceholder: string;
          codePlaceholder: string;
          descriptionPlaceholder: string;
          nameRequired: string;
          codeRequired: string;
          codeInvalid: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectRolesToDelete: string;
          getDetailFailed: string;
        };
        permissionManagement: {
          title: string;
          name: string;
          code: string;
          resource: string;
          action: string;
          parent: string;
          description: string;
          status: string;
          createdAt: string;
          updatedAt: string;
          active: string;
          inactive: string;
          noParent: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          namePlaceholder: string;
          codePlaceholder: string;
          resourcePlaceholder: string;
          actionPlaceholder: string;
          parentPlaceholder: string;
          descriptionPlaceholder: string;
          nameRequired: string;
          codeRequired: string;
          codeInvalid: string;
          resourceRequired: string;
          actionRequired: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectPermissionsToDelete: string;
          getDetailFailed: string;
        };
        announcementManagement: {
          title: string;
          name: string;
          content: string;
          type: string;
          priority: string;
          status: string;
          publishedAt: string;
          expiresAt: string;
          createdAt: string;
          updatedAt: string;
          published: string;
          unpublished: string;
          all: string;
          typeNotice: string;
          typeAnnouncement: string;
          typeWarning: string;
          typeInfo: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          typePlaceholder: string;
          titlePlaceholder: string;
          contentPlaceholder: string;
          priorityPlaceholder: string;
          publishedAtPlaceholder: string;
          expiresAtPlaceholder: string;
          titleRequired: string;
          contentRequired: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectAnnouncementsToDelete: string;
          getDetailFailed: string;
        };
        notificationManagement: {
          title: string;
          name: string;
          content: string;
          type: string;
          priority: string;
          status: string;
          sentAt: string;
          expiresAt: string;
          createdAt: string;
          updatedAt: string;
          sent: string;
          unsent: string;
          all: string;
          typeInfo: string;
          typeWarning: string;
          typeError: string;
          typeSuccess: string;
          targetUsers: string;
          targetRoles: string;
          readStatus: string;
          allUsers: string;
          users: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          typePlaceholder: string;
          titlePlaceholder: string;
          contentPlaceholder: string;
          priorityPlaceholder: string;
          sentAtPlaceholder: string;
          expiresAtPlaceholder: string;
          targetUsersPlaceholder: string;
          targetRolesPlaceholder: string;
          titleRequired: string;
          contentRequired: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectNotificationsToDelete: string;
          getDetailFailed: string;
        };
        alertManagement: {
          title: string;
          name: string;
          description: string;
          level: string;
          status: string;
          condition: string;
          threshold: string;
          metric: string;
          enabled: string;
          disabled: string;
          targetUsers: string;
          targetRoles: string;
          triggerCount: string;
          lastTriggeredAt: string;
          createdAt: string;
          updatedAt: string;
          all: string;
          levelCritical: string;
          levelWarning: string;
          levelInfo: string;
          statusActive: string;
          statusResolved: string;
          statusAcknowledged: string;
          metricCpu: string;
          metricMemory: string;
          metricDisk: string;
          metricNetwork: string;
          metricResponseTime: string;
          allUsers: string;
          users: string;
          acknowledge: string;
          resolve: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          enabledStatusPlaceholder: string;
          namePlaceholder: string;
          descriptionPlaceholder: string;
          levelPlaceholder: string;
          metricPlaceholder: string;
          conditionPlaceholder: string;
          thresholdPlaceholder: string;
          targetUsersPlaceholder: string;
          targetRolesPlaceholder: string;
          nameRequired: string;
          levelRequired: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          acknowledgeSuccess: string;
          resolveSuccess: string;
          confirmBatchDelete: string;
          selectAlertsToDelete: string;
          getDetailFailed: string;
        };
        logManagement: {
          title: string;
          action: string;
          module: string;
          username: string;
          ip: string;
          requestMethod: string;
          requestUrl: string;
          responseStatus: string;
          duration: string;
          userAgent: string;
          requestBody: string;
          responseBody: string;
          error: string;
          createdAt: string;
          updatedAt: string;
          logDetail: string;
          basicInfo: string;
          requestInfo: string;
          responseInfo: string;
          clearLogs: string;
          all: string;
          actionCreate: string;
          actionUpdate: string;
          actionDelete: string;
          actionLogin: string;
          actionLogout: string;
          actionRead: string;
          moduleUser: string;
          moduleRole: string;
          modulePermission: string;
          moduleAnnouncement: string;
          moduleNotification: string;
          moduleAlert: string;
          moduleSystem: string;
          id: string;
          searchPlaceholder: string;
          actionPlaceholder: string;
          modulePlaceholder: string;
          userPlaceholder: string;
          userId: string;
          ipPlaceholder: string;
          methodPlaceholder: string;
          statusCodePlaceholder: string;
          startDatePlaceholder: string;
          endDatePlaceholder: string;
          confirmDelete: string;
          confirmBatchDelete: string;
          confirmClearLogs: string;
          selectLogsToDelete: string;
          batchDeleteSuccess: string;
          clearLogsSuccess: string;
          getDetailFailed: string;
        };
        versionLogManagement: {
          title: string;
          version: string;
          type: string;
          releaseDate: string;
          content: string;
          features: string;
          fixes: string;
          improvements: string;
          status: string;
          publishedAt: string;
          createdAt: string;
          updatedAt: string;
          published: string;
          unpublished: string;
          all: string;
          typeMajor: string;
          typeMinor: string;
          typePatch: string;
          searchPlaceholder: string;
          statusPlaceholder: string;
          typePlaceholder: string;
          versionPlaceholder: string;
          releaseDatePlaceholder: string;
          contentPlaceholder: string;
          featuresPlaceholder: string;
          fixesPlaceholder: string;
          improvementsPlaceholder: string;
          publishedAtPlaceholder: string;
          versionRequired: string;
          versionInvalid: string;
          typeRequired: string;
          releaseDateRequired: string;
          contentRequired: string;
          createSuccess: string;
          updateSuccess: string;
          deleteSuccess: string;
          batchDeleteSuccess: string;
          toggleStatusSuccess: string;
          confirmBatchDelete: string;
          selectVersionLogsToDelete: string;
          getDetailFailed: string;
        };
      };
      form: {
        required: string;
        userName: FormMsg;
        phone: FormMsg;
        pwd: FormMsg;
        confirmPwd: FormMsg;
        code: FormMsg;
        email: FormMsg;
      };
      dropdown: Record<Global.DropdownKey, string>;
      icon: {
        themeConfig: string;
        themeSchema: string;
        lang: string;
        fullscreen: string;
        fullscreenExit: string;
        reload: string;
        collapse: string;
        expand: string;
        pin: string;
        unpin: string;
      };
      datatable: {
        itemCount: string;
      };
    };

    type GetI18nKey<T extends Record<string, unknown>, K extends keyof T = keyof T> = K extends string
      ? T[K] extends Record<string, unknown>
        ? `${K}.${GetI18nKey<T[K]>}`
        : K
      : never;

    type I18nKey = GetI18nKey<Schema>;

    type TranslateOptions<Locales extends string> = import('vue-i18n').TranslateOptions<Locales>;

    interface $T {
      (key: I18nKey): string;
      (key: I18nKey, plural: number, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, defaultMsg: string, options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], options?: TranslateOptions<I18nKey>): string;
      (key: I18nKey, list: unknown[], plural: number): string;
      (key: I18nKey, list: unknown[], defaultMsg: string): string;
      (key: I18nKey, named: Record<string, unknown>, options?: TranslateOptions<LangType>): string;
      (key: I18nKey, named: Record<string, unknown>, plural: number): string;
      (key: I18nKey, named: Record<string, unknown>, defaultMsg: string): string;
    }
  }

  /** Service namespace */
  namespace Service {
    /** Other baseURL key */
    type OtherBaseURLKey = 'demo';

    interface ServiceConfigItem {
      /** The backend service base url */
      baseURL: string;
      /** The proxy pattern of the backend service base url */
      proxyPattern: string;
    }

    interface OtherServiceConfigItem extends ServiceConfigItem {
      key: OtherBaseURLKey;
    }

    /** The backend service config */
    interface ServiceConfig extends ServiceConfigItem {
      /** Other backend service config */
      other: OtherServiceConfigItem[];
    }

    interface SimpleServiceConfig extends Pick<ServiceConfigItem, 'baseURL'> {
      other: Record<OtherBaseURLKey, string>;
    }

    /** The backend service response data */
    type Response<T = unknown> = {
      /** Response data */
      data: T;
      /** Business status code (200=success, 201=created, 1xxx-5xxx=error) */
      code: number;
      /** Response message (default "Success") */
      message: string;
      /** Timestamp (ISO format) */
      timestamp: string;
    };

    /** The demo backend service response data */
    type DemoResponse<T = unknown> = {
      /** The backend service response code */
      status: string;
      /** The backend service response message */
      message: string;
      /** The backend service response data */
      result: T;
    };
  }
}
