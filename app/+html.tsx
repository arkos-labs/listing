import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* Disable zoom to make the app feel more native on mobile web */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA: fait tourner l'app en plein écran (sans barre de navigateur) une fois ajoutée à l'écran d'accueil */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f3f1ea" />
        <meta name="background-color" content="#f3f1ea" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS (Safari n'utilise pas le manifest.json pour le mode plein écran) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CourseLog" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <link rel="icon" href="/favicon.png" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Script pour interdire le pinch-to-zoom sur iOS Safari */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
              });
              document.addEventListener('touchmove', function(e) {
                if (e.touches && e.touches.length > 1) {
                  e.preventDefault();
                }
              }, { passive: false });
            `,
          }}
        />

        {/* Google AdSense */}
        <meta name="google-adsense-account" content="ca-pub-5513617564627484" />
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5513617564627484" 
          crossOrigin="anonymous" 
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
