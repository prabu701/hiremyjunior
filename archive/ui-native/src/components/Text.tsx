import { Text as RNText, type TextProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const VARIANTS: Record<Variant, { fontFamily: string; fontSize: number; lineHeight?: number; muted?: boolean }> = {
  display: { fontFamily: FONTS.displayBold, fontSize: 30, lineHeight: 34.5 },
  title: { fontFamily: FONTS.display, fontSize: 24, lineHeight: 29 },
  heading: { fontFamily: FONTS.display, fontSize: 16.5, lineHeight: 21 },
  body: { fontFamily: FONTS.body, fontSize: 14.5, lineHeight: 21.75 },
  label: { fontFamily: FONTS.bodySemi, fontSize: 12.5, muted: true },
  caption: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 18, muted: true },
};

export function Text({ variant = 'body', muted, color, style, ...rest }: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const { t } = useTheme();
  const v = VARIANTS[variant];
  const resolved = color ?? ((muted ?? v.muted) ? t.muted : t.text);
  return <RNText {...rest} style={[{ fontFamily: v.fontFamily, fontSize: v.fontSize, lineHeight: v.lineHeight, color: resolved }, style]} />;
}
