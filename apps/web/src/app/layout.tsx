import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import { Providers } from '@/components/Providers';
import { CORNERS_COOKIE, DEFAULT_CORNERS, DEFAULT_THEME, isCornerStyle, isThemeKey, THEME_COOKIE } from '@/lib/theme';
import './globals.css';

// Variable fonts vendored in src/fonts (OFL) so builds never depend on reaching Google Fonts.
const fredoka = localFont({ src: '../fonts/fredoka-latin.woff2', weight: '300 700', variable: '--font-fredoka', display: 'swap' });
const jakarta = localFont({ src: '../fonts/jakarta-latin.woff2', weight: '200 800', variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'HireMyJunior — Real jobs for teens, with parents in the loop', template: '%s · HireMyJunior' },
  description:
    'HireMyJunior connects 14–17 year olds with paid jobs from verified neighbors and businesses. Parents approve every job. Now piloting in Washington State.',
  applicationName: 'HireMyJunior',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdf6ec' },
    { media: '(prefers-color-scheme: dark)', color: '#131219' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Render the saved theme on the server so there's no flash of the wrong colours.
  const store = await cookies();
  const theme = store.get(THEME_COOKIE)?.value;
  const corners = store.get(CORNERS_COOKIE)?.value;
  return (
    <html
      lang="en"
      data-theme={isThemeKey(theme) ? theme : DEFAULT_THEME}
      data-corners={isCornerStyle(corners) ? corners : DEFAULT_CORNERS}
      className={`${fredoka.variable} ${jakarta.variable}`}
    >
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
