// One Ant Design theme for the whole app. Pages that used to define their own
// ConfigProvider now import this so buttons, tables and inputs match everywhere.
export const BRAND = {
  asphalt: "#12161d",
  amber: "#f5b301",
  primary: "#2b4c9b",
};

export const FONT_STACK =
  '"Schibsted Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const antdTheme = {
  token: {
    colorPrimary: BRAND.primary,
    colorLink: BRAND.primary,
    colorInfo: BRAND.primary,
    colorInfoBg: "#eef2fb",
    colorInfoBorder: "#c9d5f0",
    colorSuccess: "#188a5a",
    colorWarning: "#c97a06",
    colorError: "#cc3b3b",
    colorBgLayout: "#eef0f3",
    colorTextBase: "#151a22",
    colorBorder: "#d9dde3",
    colorBorderSecondary: "#e6e9ed",
    fontFamily: FONT_STACK,
    fontSize: 14,
    borderRadius: 8,
    borderRadiusLG: 12,
    boxShadow: "0 1px 2px rgba(18,22,29,.06), 0 8px 24px rgba(18,22,29,.06)",
    boxShadowSecondary: "0 12px 32px rgba(18,22,29,.14)",
  },
  components: {
    Button: { fontWeight: 600, controlHeight: 36, primaryShadow: "none" },
    Card: { borderRadiusLG: 14, headerFontSize: 15 },
    Table: {
      headerBg: "#f6f7f9",
      headerColor: "#556070",
      headerSplitColor: "transparent",
      rowHoverBg: "#f3f6fc",
      borderColor: "#e6e9ed",
    },
    Tabs: { inkBarColor: "#f5b301", itemSelectedColor: "#151a22", itemHoverColor: "#151a22" },
    Segmented: { itemSelectedBg: "#ffffff", trackBg: "#e6e9ed" },
    Input: { activeShadow: "0 0 0 3px rgba(43,76,155,.14)" },
    Select: { optionSelectedBg: "#eef2fb" },
  },
};