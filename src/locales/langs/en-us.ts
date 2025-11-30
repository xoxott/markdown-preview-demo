const local: App.I18n.Schema = {
  system: {
    title: 'SoybeanAdmin',
    updateTitle: 'System Version Update Notification',
    updateContent: 'A new version of the system has been detected. Do you want to refresh the page immediately?',
    updateConfirm: 'Refresh immediately',
    updateCancel: 'Later'
  },
  common: {
    action: 'Action',
    add: 'Add',
    addSuccess: 'Add Success',
    backToHome: 'Back to home',
    batchDelete: 'Batch Delete',
    cancel: 'Cancel',
    close: 'Close',
    check: 'Check',
    expandColumn: 'Expand Column',
    columnSetting: 'Column Setting',
    config: 'Config',
    confirm: 'Confirm',
    delete: 'Delete',
    deleteSuccess: 'Delete Success',
    confirmDelete: 'Are you sure you want to delete?',
    edit: 'Edit',
    warning: 'Warning',
    error: 'Error',
    index: 'Index',
    keywordSearch: 'Please enter keyword',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
    lookForward: 'Coming soon',
    modify: 'Modify',
    modifySuccess: 'Modify Success',
    noData: 'No Data',
    operate: 'Operate',
    pleaseCheckValue: 'Please check whether the value is valid',
    refresh: 'Refresh',
    reset: 'Reset',
    search: 'Search',
    switch: 'Switch',
    tip: 'Tip',
    trigger: 'Trigger',
    update: 'Update',
    updateSuccess: 'Update Success',
    userCenter: 'User Center',
    yesOrNo: {
      yes: 'Yes',
      no: 'No'
    }
  },
  request: {
    logout: 'Logout user after request failed',
    logoutMsg: 'User status is invalid, please log in again',
    logoutWithModal: 'Pop up modal after request failed and then log out user',
    logoutWithModalMsg: 'User status is invalid, please log in again',
    refreshToken: 'The requested token has expired, refresh the token',
    tokenExpired: 'The requested token has expired'
  },
  theme: {
    themeSchema: {
      title: 'Theme Schema',
      light: 'Light',
      dark: 'Dark',
      auto: 'Follow System'
    },
    grayscale: 'Grayscale',
    colourWeakness: 'Colour Weakness',
    layoutMode: {
      title: 'Layout Mode',
      vertical: 'Vertical Menu Mode',
      horizontal: 'Horizontal Menu Mode',
      'vertical-mix': 'Vertical Mix Menu Mode',
      'horizontal-mix': 'Horizontal Mix menu Mode',
      reverseHorizontalMix: 'Reverse first level menus and child level menus position'
    },
    recommendColor: 'Apply Recommended Color Algorithm',
    recommendColorDesc: 'The recommended color algorithm refers to',
    themeColor: {
      title: 'Theme Color',
      primary: 'Primary',
      info: 'Info',
      success: 'Success',
      warning: 'Warning',
      error: 'Error',
      followPrimary: 'Follow Primary'
    },
    scrollMode: {
      title: 'Scroll Mode',
      wrapper: 'Wrapper',
      content: 'Content'
    },
    page: {
      animate: 'Page Animate',
      mode: {
        title: 'Page Animate Mode',
        fade: 'Fade',
        'fade-slide': 'Slide',
        'fade-bottom': 'Fade Zoom',
        'fade-scale': 'Fade Scale',
        'zoom-fade': 'Zoom Fade',
        'zoom-out': 'Zoom Out',
        none: 'None'
      }
    },
    fixedHeaderAndTab: 'Fixed Header And Tab',
    header: {
      height: 'Header Height',
      breadcrumb: {
        visible: 'Breadcrumb Visible',
        showIcon: 'Breadcrumb Icon Visible'
      },
      multilingual: {
        visible: 'Display multilingual button'
      }
    },
    tab: {
      visible: 'Tab Visible',
      cache: 'Tag Bar Info Cache',
      height: 'Tab Height',
      mode: {
        title: 'Tab Mode',
        chrome: 'Chrome',
        button: 'Button'
      }
    },
    sider: {
      inverted: 'Dark Sider',
      width: 'Sider Width',
      collapsedWidth: 'Sider Collapsed Width',
      mixWidth: 'Mix Sider Width',
      mixCollapsedWidth: 'Mix Sider Collapse Width',
      mixChildMenuWidth: 'Mix Child Menu Width'
    },
    footer: {
      visible: 'Footer Visible',
      fixed: 'Fixed Footer',
      height: 'Footer Height',
      right: 'Right Footer'
    },
    watermark: {
      visible: 'Watermark Full Screen Visible',
      text: 'Watermark Text'
    },
    themeDrawerTitle: 'Theme Configuration',
    pageFunTitle: 'Page Function',
    resetCacheStrategy: {
      title: 'Reset Cache Strategy',
      close: 'Close Page',
      refresh: 'Refresh Page'
    },
    configOperation: {
      copyConfig: 'Copy Config',
      copySuccessMsg: 'Copy Success, Please replace the variable "themeSettings" in "src/theme/settings.ts"',
      resetConfig: 'Reset Config',
      resetSuccessMsg: 'Reset Success'
    }
  },
  route: {
    login: 'Login',
    403: 'No Permission',
    404: 'Page Not Found',
    500: 'Server Error',
    'iframe-page': 'Iframe',
    home: 'Home',
    chat: 'Chat',
    markdownedit: 'MarkdownEdit',
    upload: 'Upload',
    'upload-v2-demo': 'Upload v2 Demo',
    utils: 'Utils',
    component: 'component',
    mobile: 'mobile',
    'file-manager': 'file-manager',
    monitoring: 'Dashboard',
    'user-management': 'User Management',
    'role-management': 'Role Management',
    'permission-management': 'Permission Management'
  },
  page: {
    login: {
      common: {
        loginOrRegister: 'Login / Register',
        userNamePlaceholder: 'Please enter user name',
        phonePlaceholder: 'Please enter phone number',
        codePlaceholder: 'Please enter verification code',
        passwordPlaceholder: 'Please enter password',
        confirmPasswordPlaceholder: 'Please enter password again',
        codeLogin: 'Verification code login',
        confirm: 'Confirm',
        back: 'Back',
        validateSuccess: 'Verification passed',
        loginSuccess: 'Login successfully',
        welcomeBack: 'Welcome back, {userName} !'
      },
      pwdLogin: {
        title: 'Password Login',
        rememberMe: 'Remember me',
        forgetPassword: 'Forget password?',
        register: 'Register',
        otherAccountLogin: 'Other Account Login',
        otherLoginMode: 'Other Login Mode',
        superAdmin: 'Super Admin',
        admin: 'Admin',
        user: 'User'
      },
      codeLogin: {
        title: 'Verification Code Login',
        getCode: 'Get verification code',
        reGetCode: 'Reacquire after {time}s',
        sendCodeSuccess: 'Verification code sent successfully',
        imageCodePlaceholder: 'Please enter image verification code'
      },
      register: {
        title: 'Register',
        agreement: 'I have read and agree to',
        protocol: '《User Agreement》',
        policy: '《Privacy Policy》'
      },
      resetPwd: {
        title: 'Reset Password'
      },
      bindWeChat: {
        title: 'Bind WeChat'
      }
    },
    home: {
      branchDesc:
        'For the convenience of everyone in developing and updating the merge, we have streamlined the code of the main branch, only retaining the homepage menu, and the rest of the content has been moved to the example branch for maintenance. The preview address displays the content of the example branch.',
      greeting: 'Good morning, {userName}, today is another day full of vitality!',
      weatherDesc: 'Today is cloudy to clear, 20℃ - 25℃!',
      projectCount: 'Project Count',
      todo: 'Todo',
      message: 'Message',
      downloadCount: 'Download Count',
      registerCount: 'Register Count',
      schedule: 'Work and rest Schedule',
      study: 'Study',
      work: 'Work',
      rest: 'Rest',
      entertainment: 'Entertainment',
      visitCount: 'Visit Count',
      turnover: 'Turnover',
      dealCount: 'Deal Count',
      projectNews: {
        title: 'Project News',
        moreNews: 'More News',
        desc1: 'Soybean created the open source project soybean-admin on May 28, 2021!',
        desc2: 'Yanbowe submitted a bug to soybean-admin, the multi-tab bar will not adapt.',
        desc3: 'Soybean is ready to do sufficient preparation for the release of soybean-admin!',
        desc4: 'Soybean is busy writing project documentation for soybean-admin!',
        desc5: 'Soybean just wrote some of the workbench pages casually, and it was enough to see!'
      },
      creativity: 'Creativity'
    },
    userManagement: {
      title: 'User Management',
      username: 'Username',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      onlineStatus: 'Online Status',
      blacklistStatus: 'Blacklist Status',
      createdAt: 'Created At',
      lastLoginAt: 'Last Login',
      active: 'Active',
      inactive: 'Inactive',
      online: 'Online',
      offline: 'Offline',
      blacklisted: 'Blacklisted',
      notBlacklisted: 'Not Blacklisted',
      searchPlaceholder: 'Please enter username or email',
      statusPlaceholder: 'Status',
      onlineStatusPlaceholder: 'Online Status',
      blacklistStatusPlaceholder: 'Blacklist Status',
      rolePlaceholder: 'Please select role',
      roleRequired: 'Please select at least one role',
      passwordPlaceholder: 'Please enter password',
      passwordPlaceholderEdit: 'Leave blank to keep current password',
      createSuccess: 'User created successfully',
      updateSuccess: 'User updated successfully',
      deleteSuccess: 'User deleted successfully',
      batchDeleteSuccess: 'Batch delete successfully',
      toggleStatusSuccess: 'Status updated successfully',
      confirmBatchDelete: 'Are you sure you want to delete {count} selected users?',
      selectUsersToDelete: 'Please select users to delete',
      getDetailFailed: 'Failed to get user details'
    },
    roleManagement: {
      title: 'Role Management',
      name: 'Role Name',
      code: 'Role Code',
      description: 'Description',
      status: 'Status',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      active: 'Active',
      inactive: 'Inactive',
      searchPlaceholder: 'Please enter role name or code',
      statusPlaceholder: 'Status',
      namePlaceholder: 'Please enter role name',
      codePlaceholder: 'Please enter role code',
      descriptionPlaceholder: 'Please enter role description (optional)',
      nameRequired: 'Please enter role name',
      codeRequired: 'Please enter role code',
      codeInvalid: 'Invalid role code format, should be uppercase letters, numbers or underscores, and start with a letter or underscore',
      createSuccess: 'Role created successfully',
      updateSuccess: 'Role updated successfully',
      deleteSuccess: 'Role deleted successfully',
      batchDeleteSuccess: 'Batch delete successfully',
      toggleStatusSuccess: 'Status updated successfully',
      confirmBatchDelete: 'Are you sure you want to delete {count} selected roles?',
      selectRolesToDelete: 'Please select roles to delete',
      getDetailFailed: 'Failed to get role details'
    },
    permissionManagement: {
      title: 'Permission Management',
      name: 'Permission Name',
      code: 'Permission Code',
      resource: 'Resource',
      action: 'Action',
      parent: 'Parent Permission',
      description: 'Description',
      status: 'Status',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      active: 'Active',
      inactive: 'Inactive',
      noParent: 'No Parent',
      searchPlaceholder: 'Please enter permission name or code',
      statusPlaceholder: 'Status',
      namePlaceholder: 'Please enter permission name',
      codePlaceholder: 'Please enter permission code',
      resourcePlaceholder: 'Please select or enter resource',
      actionPlaceholder: 'Please select or enter action',
      parentPlaceholder: 'Please select parent permission (optional)',
      descriptionPlaceholder: 'Please enter permission description (optional)',
      nameRequired: 'Please enter permission name',
      codeRequired: 'Please enter permission code',
      codeInvalid: 'Invalid permission code format, should be uppercase letters, numbers or underscores, and start with a letter or underscore',
      resourceRequired: 'Please select or enter resource',
      actionRequired: 'Please select or enter action',
      createSuccess: 'Permission created successfully',
      updateSuccess: 'Permission updated successfully',
      deleteSuccess: 'Permission deleted successfully',
      batchDeleteSuccess: 'Batch delete successfully',
      toggleStatusSuccess: 'Status updated successfully',
      confirmBatchDelete: 'Are you sure you want to delete {count} selected permissions?',
      selectPermissionsToDelete: 'Please select permissions to delete',
      getDetailFailed: 'Failed to get permission details'
    }
  },
  form: {
    required: 'Cannot be empty',
    userName: {
      required: 'Please enter user name',
      invalid: 'User name format is incorrect'
    },
    phone: {
      required: 'Please enter phone number',
      invalid: 'Phone number format is incorrect'
    },
    pwd: {
      required: 'Please enter password',
      invalid: '6-18 characters, including letters, numbers, and underscores'
    },
    confirmPwd: {
      required: 'Please enter password again',
      invalid: 'The two passwords are inconsistent'
    },
    code: {
      required: 'Please enter verification code',
      invalid: 'Verification code format is incorrect'
    },
    email: {
      required: 'Please enter email',
      invalid: 'Email format is incorrect'
    }
  },
  dropdown: {
    closeCurrent: 'Close Current',
    closeOther: 'Close Other',
    closeLeft: 'Close Left',
    closeRight: 'Close Right',
    closeAll: 'Close All'
  },
  icon: {
    themeConfig: 'Theme Configuration',
    themeSchema: 'Theme Schema',
    lang: 'Switch Language',
    fullscreen: 'Fullscreen',
    fullscreenExit: 'Exit Fullscreen',
    reload: 'Reload Page',
    collapse: 'Collapse Menu',
    expand: 'Expand Menu',
    pin: 'Pin',
    unpin: 'Unpin'
  },
  datatable: {
    itemCount: 'Total {total} items'
  }
};

export default local;
