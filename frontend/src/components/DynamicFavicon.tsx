import { useEffect } from 'react';
import { useBrandingConfig } from '../hooks/useBranding';

/**
 * Synchronizes the document's favicon and apple-touch-icon with the
 * dynamic branding configuration stored in Firestore (/settings/branding).
 */
export function DynamicFavicon() {
  const { data: branding } = useBrandingConfig();

  useEffect(() => {
    const rawFavicon = branding?.faviconUrl?.trim();

    const iconLinks = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']"
    );

    if (!rawFavicon) {
      iconLinks.forEach((link) => link.remove());
      return;
    }

    const standardIcons = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel='shortcut icon']"
    );
    if (standardIcons.length > 0) {
      standardIcons.forEach((link) => {
        link.href = rawFavicon;
        link.removeAttribute('type');
      });
    } else {
      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.href = rawFavicon;
      document.head.appendChild(newIcon);
    }

    const appleIcons = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='apple-touch-icon']"
    );
    if (appleIcons.length > 0) {
      appleIcons.forEach((link) => {
        link.href = rawFavicon;
      });
    } else {
      const appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = rawFavicon;
      document.head.appendChild(appleIcon);
    }
  }, [branding?.faviconUrl]);

  return null;
}
