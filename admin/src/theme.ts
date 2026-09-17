import { createTheme } from '@mui/material/styles';

/**
 * 把站点的设计令牌映射为 MUI 主题。
 * 令牌数值与 src/styles/tokens.css 保持一致 —— 改一处需同步另一处。
 * 后台是内部工具，不追求与站点视觉完全一致，但保持同源的色彩与字体。
 */
export const tokens = {
  canvas: '#f7f7f5',
  surface: '#ffffff',
  surfaceSubtle: '#f1f1ee',
  ink: '#1a1a1a',
  inkSecondary: '#565650',
  inkTertiary: '#8a8a82',
  line: '#e2e2dd',
  lineStrong: '#c9c9c2',
  accent: '#1d4e89',
  accentHover: '#163c6b',
  accentSoft: '#eaf0f7',
  accentInk: '#0f2b4c',
  success: '#16865c',
  warning: '#c77908',
  error: '#c53e4a',
  fontSans: '"IBM Plex Sans", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
  fontSerif: '"Noto Serif SC", "Source Serif 4", Georgia, serif',
  fontMono: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
} as const;

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.accent,
      dark: tokens.accentHover,
      light: tokens.accentSoft,
      contrastText: '#ffffff',
    },
    success: { main: tokens.success },
    warning: { main: tokens.warning },
    error: { main: tokens.error },
    background: { default: tokens.canvas, paper: tokens.surface },
    text: {
      primary: tokens.ink,
      secondary: tokens.inkSecondary,
      disabled: tokens.inkTertiary,
    },
    divider: tokens.line,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: tokens.fontSans,
    fontSize: 14,
    h1: { fontFamily: tokens.fontSerif, fontSize: '1.75rem', fontWeight: 600 },
    h2: { fontFamily: tokens.fontSerif, fontSize: '1.375rem', fontWeight: 600 },
    h3: { fontFamily: tokens.fontSerif, fontSize: '1.125rem', fontWeight: 600 },
    h4: { fontSize: '1rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { minHeight: 40, borderRadius: 6 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiSelect: {
      defaultProps: { size: 'small' },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          borderBottom: `1px solid ${tokens.line}`,
          color: tokens.ink,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: tokens.surfaceSubtle,
          borderRight: `1px solid ${tokens.line}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: tokens.surfaceSubtle,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 3 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem' },
      },
    },
  },
});

export const monoFont = tokens.fontMono;
