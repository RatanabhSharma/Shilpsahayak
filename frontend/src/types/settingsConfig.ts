/**
 * ============================================================================
 * Shilp Sahayak — Administrative & Storefront Configuration Types
 * ============================================================================
 * 
 * Formal TypeScript contracts for the 9 planned configuration subdocuments
 * under the top-level Firestore `/settings` collection:
 * 
 *  1. /settings/business      - Legal, contact, address, registration
 *  2. /settings/branding      - Logos, favicons, colors, taglines
 *  3. /settings/storefront    - Homepage hero, banners, featured sections
 *  4. /settings/navigation    - Header & footer link hierarchies
 *  5. /settings/shipping      - Carriers, flat rates, thresholds, pincode rules
 *  6. /settings/seo           - Meta tags, OpenGraph, Twitter cards, robots
 *  7. /settings/policies      - Terms, privacy, refund, shipping policies
 *  8. /settings/notifications - Email recipients, webhook alerts, event toggles
 *  9. /settings/pricing       - Slicer rates, minimum order, GST, COD rules
 * 
 * BACKWARD COMPATIBILITY GUARANTEE:
 * These types extend or mirror existing store/settings schemas to ensure zero
 * regression for current live production hooks and components.
 */

/* -------------------------------------------------------------------------- */
/* 1. Business Information (/settings/business)                               */
/* -------------------------------------------------------------------------- */

export interface BusinessConfig {
  businessName: string;
  tagline?: string;
  legalEntityName?: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstin?: string;
  cin?: string;
  pan?: string;
  supportHours?: string;
  googleMapsUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 2. Branding Assets & Identity (/settings/branding)                         */
/* -------------------------------------------------------------------------- */

export interface BrandingConfig {
  primaryLogoUrl: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  symbolIconUrl?: string;
  primaryColorHex?: string;
  accentColorHex?: string;
  brandTagline?: string;
  socialLinks?: {
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
    linkedin?: string;
    twitter?: string;
    github?: string;
    email?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 3. Storefront / Homepage Layout (/settings/storefront)                     */
/* -------------------------------------------------------------------------- */

export interface HeroSlide {
  id: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  mediaType: 'video' | 'image';
  mediaUrl: string;
  posterUrl?: string;
  badgeText?: string;
}

export interface StorefrontBanner {
  active: boolean;
  text: string;
  link?: string;
  linkLabel?: string;
  backgroundColorHex?: string;
  textColorHex?: string;
}

export interface StorefrontHero {
  badgeText: string;
  headline: string;
  subheadline: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  enablePrimaryCta?: boolean;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  enableSecondaryCta?: boolean;
  heroVideoUrl?: string;
  heroPosterUrl?: string;
  heroImageUrl?: string;
  heroImageMode?: 'image' | 'slideshow';
  heroSlideshowImageUrls?: string[];
  enableVideo?: boolean;
  showVideoTextOverlay?: boolean;
}

export interface StorefrontSectionVisibility {
  announcement: boolean;
  hero: boolean;
  trustMarquee: boolean;
  featuredProducts: boolean;
  shilpStudioPromo: boolean;
  categories: boolean;
  reviews: boolean;
  finalCta: boolean;
}

export interface StorefrontConfig {
  announcement?: StorefrontBanner;
  hero: StorefrontHero;
  featuredTitle?: string;
  featuredSubtitle?: string;
  featuredProductIds: string[];
  customPromoTitle?: string;
  customPromoButtonText?: string;
  customPromoButtonLink?: string;
  customPromoButtonEnabled?: boolean;
  sectionVisibility?: Partial<StorefrontSectionVisibility>;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 4. Navigation Architecture (/settings/navigation)                          */
/* -------------------------------------------------------------------------- */

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  isExternal?: boolean;
  badge?: string;
  children?: NavLinkItem[];
}

export interface NavigationConfig {
  headerNav: NavLinkItem[];
  footerQuickLinks: NavLinkItem[];
  footerSupportLinks: NavLinkItem[];
  footerStudioLinks?: NavLinkItem[];
  footerLegalLinks: NavLinkItem[];
  enableMegaMenu?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 5. Shipping & Delivery Rules (/settings/shipping)                          */
/* -------------------------------------------------------------------------- */

export interface ShippingZone {
  id: string;
  name: string;
  states: string[];
  flatRate: number;
  freeShippingThreshold: number;
  estimatedDeliveryDays: string;
  isActive: boolean;
}

export interface ShippingConfig {
  defaultCourierPartner: string;
  shippingFlatRate: number;
  freeShippingThreshold: number;
  expressShippingRate?: number;
  enableExpressShipping: boolean;
  localPickupAvailable: boolean;
  localPickupAddress?: string;
  deliveryZones: ShippingZone[] | string[];
  codAvailable: boolean;
  codFee?: number;
  maxCodOrderValue: number;
  restrictedPincodes?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 6. SEO & Metadata (/settings/seo)                                          */
/* -------------------------------------------------------------------------- */

export interface SeoConfig {
  siteTitle: string;
  titleTemplate: string;
  metaDescription: string;
  metaKeywords: string[];
  ogImageUrl?: string;
  twitterHandle?: string;
  googleSiteVerificationId?: string;
  canonicalUrlRoot: string;
  allowIndexing: boolean;
  structuredDataJson?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 7. Legal & Store Policies (/settings/policies)                             */
/* -------------------------------------------------------------------------- */

export interface PolicyDocument {
  title: string;
  lastUpdated: string;
  contentMarkdown: string;
  published: boolean;
}

export interface PoliciesConfig {
  privacyPolicy: PolicyDocument;
  termsAndConditions: PolicyDocument;
  refundAndCancellation: PolicyDocument;
  shippingPolicy: PolicyDocument;
  customManufacturingAgreement?: PolicyDocument;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 8. Notification & Operational Alerts (/settings/notifications)             */
/* -------------------------------------------------------------------------- */

export interface NotificationRecipient {
  email: string;
  name?: string;
  role?: string;
  receiveOrderAlerts: boolean;
  receiveQuoteAlerts: boolean;
  receiveStockAlerts: boolean;
}

export interface NotificationsConfig {
  newOrderAlerts: boolean;
  quoteAlerts: boolean;
  lowStockAlerts: boolean;
  inquiryAlerts: boolean;
  alertEmailRecipient: string;
  additionalRecipients?: NotificationRecipient[];
  webhookUrl?: string;
  telegramChatId?: string;
  whatsappAlertNumber?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* 9. Pricing & Fabrication Matrix (/settings/pricing)                        */
/* -------------------------------------------------------------------------- */

export interface MaterialPricingRate {
  materialId: string;
  materialName: string;
  ratePerGram: number;
  setupFeePerJob: number;
  densityGPerCm3: number;
  isActive: boolean;
}

export interface PricingConfig {
  baseFee: number;
  minimumOrderValue: number;
  defaultGSTRate: number;
  rushFeeMultiplier?: number;
  materials: MaterialPricingRate[];
  upiId: string;
  codEnabled: boolean;
  maxCodOrderValue: number;
  updatedAt?: string;
  updatedBy?: string;
}

/* -------------------------------------------------------------------------- */
/* Unified Settings Registry Interface                                        */
/* -------------------------------------------------------------------------- */

export interface AppSettingsRegistry {
  business: BusinessConfig;
  branding?: BrandingConfig;
  storefront?: StorefrontConfig;
  navigation?: NavigationConfig;
  shipping: ShippingConfig;
  seo?: SeoConfig;
  policies?: PoliciesConfig;
  notifications: NotificationsConfig;
  pricing: PricingConfig;
}
