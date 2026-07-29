/**
 * Page chrome around a legal document — everything that is not the document
 * text itself: the date line, the footer links, the language switch.
 *
 * A locale-keyed plain object rather than the react-intl catalog, for the same
 * reason the checker's copy modules are: these routes render outside the
 * authenticated island in `__root.tsx` and so have no `IntlProvider` above them.
 */
import type { Locale } from "@/client/i18n/config";

interface LegalChromeCopy {
  lastUpdatedLabel: string;
  termsLinkLabel: string;
  privacyLinkLabel: string;
  checkerLinkLabel: string;
  homeAria: string;
  /** Names the language being switched TO, as that language names itself. */
  languageSwitchLabel: string;
  languageSwitchAria: string;
}

export const LEGAL_CHROME_COPY: Record<Locale, LegalChromeCopy> = {
  en: {
    lastUpdatedLabel: "Last updated",
    termsLinkLabel: "Terms and Conditions",
    privacyLinkLabel: "Privacy Policy",
    checkerLinkLabel: "Free SEO Checker",
    homeAria: "EchoSEO home",
    languageSwitchLabel: "Tiếng Việt",
    languageSwitchAria: "Xem trang này bằng tiếng Việt",
  },
  vi: {
    lastUpdatedLabel: "Cập nhật lần cuối",
    termsLinkLabel: "Điều khoản sử dụng",
    privacyLinkLabel: "Chính sách quyền riêng tư",
    checkerLinkLabel: "Công cụ kiểm tra SEO",
    homeAria: "Trang chủ EchoSEO",
    languageSwitchLabel: "English",
    languageSwitchAria: "View this page in English",
  },
};
