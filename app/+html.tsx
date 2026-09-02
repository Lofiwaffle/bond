import type { PropsWithChildren } from 'react'
import { ScrollViewStyleReset } from 'expo-router/html'

const base = process.env.EXPO_PUBLIC_BASE_PATH ?? ''

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#F7F2EF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Bond" />
        <meta
          name="description"
          content="Daily check-ins, shared goals, and weekly reviews for the two of you."
        />
        <link rel="manifest" href={`${base}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${base}/pwa-192.png`} />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                min-height: 100dvh;
                width: 100%;
                margin: 0;
              }
              body {
                background: #F7F2EF;
                font-family: Inter_400Regular, Inter, system-ui, sans-serif;
              }
              #root {
                display: flex;
                justify-content: center;
                min-height: 100dvh;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
