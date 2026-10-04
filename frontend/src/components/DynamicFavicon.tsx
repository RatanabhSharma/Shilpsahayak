import { useEffect } from 'react';
import { useBrandingConfig } from '../hooks/useBranding';

const DEFAULT_FAVICON_HREF = '/images/logo.png';

/**
 * Synchronizes the document's favicon and apple-touch-icon with the
 * dynamic branding configuration stored in Firestore (/settings/branding).
 * 
 * Falls back to the project default (/images/logo.png) if no custom favicon
 * is configured.
 */
export function DynamicFavicon() {
  const { data: branding } = useBrandingConfig();

  useEffect(() => {
    const rawFavicon = branding?.faviconUrl?.trim();
    const targetHref = rawFavicon || DEFAULT_FAVICON_HREF;

    // 1. Target standard icon link tags
    const iconLinks = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='shortcut icon']"
    );

    if (iconLinks.length > 0) {
      iconLinks.forEach((link) => {
        link.href = targetHref;
      });
    } else {
      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.type = 'image/png';
      newIcon.href = targetHref;
      document.head.appendChild(newIcon);
    }

    // 2. Also keep apple-touch-icon in sync if present, or add it
    let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = targetHref;
    } else if (rawFavicon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = targetHref;
      document.head.appendChild(appleIcon);
    }
  }, [branding?.faviconUrl]);

  return null;
}
