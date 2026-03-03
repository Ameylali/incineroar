import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    /* =========================
       Base
    ========================= */
    colorBgBase: '#0f0f18',
    colorTextBase: '#f5f3f7',

    /* =========================
       Primary
    ========================= */
    colorPrimary: '#a845cc',
    colorPrimaryHover: '#b35cd2',
    colorPrimaryActive: '#c886de',

    /* =========================
       Text
    ========================= */
    colorText: '#e6e1ea',
    colorTextSecondary: '#b7aec2',
    colorTextTertiary: '#8f8798',
    colorTextQuaternary: '#6f6876',

    /* =========================
       Backgrounds
    ========================= */
    colorBgContainer: '#12121a',
    colorBgElevated: '#1a1a24',
    colorBgLayout: '#0f0f18',
    colorBgSpotlight: '#24133a',

    /* =========================
       Borders & Split
    ========================= */
    colorBorder: '#2a1f3d',
    colorBorderSecondary: '#1f1830',

    /* =========================
       Status
    ========================= */
    colorSuccess: '#47d5a6',
    colorWarning: '#d7ac61',
    colorError: '#d94a4a',
    colorInfo: '#4077d1',

    /* =========================
       Motion
    ========================= */
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionDurationMid: '0.25s',

    /* =========================
       Radius
    ========================= */
    borderRadius: 8,
  },

  components: {
    Alert: {
      /* Base */
      colorText: '#f5f3f7',
      colorIcon: '#f5f3f7',

      /* Info */
      colorInfoBg: '#1a243a',
      colorInfoBorder: '#2f4fa8',

      /* Success */
      colorSuccessBg: '#0f2b22',
      colorSuccessBorder: '#22946e',

      /* Warning */
      colorWarningBg: '#2b2416',
      colorWarningBorder: '#a87a2a',

      /* Error */
      colorErrorBg: '#2b1515',
      colorErrorBorder: '#9c2121',

      /* Radius & spacing */
      borderRadiusLG: 8,
    },
    /* =========================
       Layout
    ========================= */
    Layout: {
      siderBg: '#0c0c14',
      triggerBg: '#161022',
      triggerColor: '#cfc8d8',
    },

    /* =========================
       Menu (v6 FIXED TOKENS)
    ========================= */
    Menu: {
      itemBg: '#0c0c14',
      subMenuItemBg: '#0a0a12',

      itemColor: '#cfc8d8',
      itemHoverColor: '#ffffff',
      itemSelectedColor: '#ffffff',

      itemHoverBg: '#1a1024',
      itemActiveBg: '#24133a',
      itemSelectedBg: '#2d1457',

      itemBorderRadius: 8,
      itemMarginInline: 8,

      iconSize: 18,
      iconMarginInlineEnd: 10,

      groupTitleColor: '#8f7aa8',
    },

    /* =========================
       Button
    ========================= */
    Button: {
      defaultBg: '#1a1a24',
      defaultBorderColor: '#2a1f3d',
      defaultColor: '#e6e1ea',

      primaryShadow: '0 0 0 2px rgba(168, 69, 204, 0.35)',
    },

    /* =========================
       Input / Select / AutoComplete
    ========================= */
    Input: {
      colorBgContainer: '#12121a',
      colorBorder: '#2a1f3d',
      colorText: '#f5f3f7',
      activeBorderColor: '#a845cc',
      hoverBorderColor: '#b35cd2',
    },

    Select: {
      colorBgContainer: '#12121a',
      colorBorder: '#2a1f3d',
      optionSelectedBg: '#2d1457',
      optionActiveBg: '#24133a',
      optionSelectedColor: '#ffffff',
    },

    /* =========================
       Dropdown
    ========================= */
    Dropdown: {
      colorBgElevated: '#1a1a24',
      colorBorder: '#2a1f3d',
    },

    /* =========================
       Table
    ========================= */
    Table: {
      colorBgContainer: '#12121a',
      headerBg: '#161022',
      headerColor: '#e6e1ea',
      rowHoverBg: '#1a1024',
      borderColor: '#241833',
      rowSelectedBg: '#2d1457',
      rowSelectedHoverBg: '#3d1b67',
    },

    /* =========================
       Modal / Drawer
    ========================= */
    Modal: {
      colorBgElevated: '#1a1a24',
      headerBg: '#1a1a24',
      contentBg: '#12121a',
    },

    Drawer: {
      colorBgElevated: '#12121a',
    },

    /* =========================
       Tooltip
    ========================= */
    Tooltip: {
      colorBgSpotlight: '#2d1457',
      colorTextLightSolid: '#ffffff',
    },
  },
};
