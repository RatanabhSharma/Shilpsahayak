import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { NavigationConfig, NavLinkItem } from '../types/settingsConfig';

const NAVIGATION_DOCUMENT_ID = 'navigation';

export const DEFAULT_NAVIGATION_CONFIG: NavigationConfig = {
  headerNav: [
    { id: 'nav-home', label: 'Home', href: '/' },
    { id: 'nav-shop', label: 'Shop', href: '/shop' },
    { id: 'nav-shilp-studio', label: 'Shilp Studio', href: '/shilp-studio', badge: 'PRO' },
    { id: 'nav-our-story', label: 'Our Story', href: '/our-story' },
    { id: 'nav-reach-us', label: 'Reach Us', href: '/reach-us' },
  ],
  footerQuickLinks: [
    { id: 'fq-1', label: 'All 3D Pieces', href: '/shop' },
    { id: 'fq-2', label: 'Lamps & Lithophanes', href: '/shop?category=Lamps%20%26%20Lighting' },
    { id: 'fq-3', label: 'Desk & Workspace', href: '/shop?category=Desk%20Decor' },
    { id: 'fq-4', label: 'Keychains & Gifts', href: '/shop?category=Keychains' },
    { id: 'fq-5', label: 'Custom Inquiries', href: '/reach-us' },
  ],
  footerStudioLinks: [
    { id: 'fs-1', label: 'Studio Philosophy', href: '/our-story' },
    { id: 'fs-2', label: 'Corporate & Bulk', href: '/reach-us?type=corporate' },
    { id: 'fs-3', label: 'About Workshop', href: '/our-story' },
    { id: 'fs-4', label: 'Contact & Inquiries', href: '/reach-us' },
  ],
  footerSupportLinks: [
    { id: 'fsu-1', label: 'Track Orders', href: '/account' },
    { id: 'fsu-2', label: 'CAD Quotes', href: '/account' },
    { id: 'fsu-3', label: 'Shipping & Delivery', href: '/reach-us' },
  ],
  footerLegalLinks: [
    { id: 'fl-1', label: 'Privacy Policy', href: '/privacy-policy' },
    { id: 'fl-2', label: 'Terms & Conditions', href: '/terms-and-conditions' },
    { id: 'fl-3', label: 'Refund Policy', href: '/refund-policy' },
    { id: 'fl-4', label: 'Cookie Policy', href: '/cookie-policy' },
  ],
  enableMegaMenu: false,
};

export const navigationKey = ['settings', NAVIGATION_DOCUMENT_ID] as const;

export function useNavigationConfig() {
  return useQuery({
    queryKey: navigationKey,
    queryFn: async (): Promise<NavigationConfig> => {
      const navRef = doc(db, 'settings', NAVIGATION_DOCUMENT_ID);
      const navSnap = await getDoc(navRef);
      if (!navSnap.exists()) {
        return DEFAULT_NAVIGATION_CONFIG;
      }
      return {
        ...DEFAULT_NAVIGATION_CONFIG,
        ...navSnap.data(),
      } as NavigationConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useUpdateNavigationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NavigationConfig) => {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('You must be logged in to update navigation.');

      const navRef = doc(db, 'settings', NAVIGATION_DOCUMENT_ID);
      const updatedData = {
        ...payload,
        updatedBy: currentUser.uid,
        updatedAt: new Date().toISOString(),
      };
      
      await setDoc(navRef, updatedData, { merge: true });
      return updatedData as NavigationConfig;
    },
    onSuccess: (newConfig) => {
      queryClient.setQueryData(navigationKey, newConfig);
    }
  });
}
