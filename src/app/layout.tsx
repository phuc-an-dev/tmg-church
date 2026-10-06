import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "cn";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DevRouteCopyButton } from "@/components/shared/dev-route-copy-button";

const geist = Geist({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "TMG Church",
    template: "%s | TMG Church",
  },
  description: "Information and administration platform for TMG Church",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={true}
          disableTransitionOnChange
        >
          <NuqsAdapter>
            {children}
            <DevRouteCopyButton />
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
