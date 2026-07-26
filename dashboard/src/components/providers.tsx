"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      themes={["dark", "light"]}
    >
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              "!bg-card !border-border-strong !text-foreground !rounded-xl !backdrop-blur-xl",
            description: "!text-muted-foreground",
          },
        }}
      />
    </NextThemeProvider>
  );
}
