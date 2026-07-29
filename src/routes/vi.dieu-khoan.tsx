import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/client/features/legal/LegalDocumentPage";
import { buildLegalHead } from "@/client/features/legal/legal-head";
import { TERMS_DOCUMENT_VI } from "@/client/features/legal/legal-content-vi";
import { LEGAL_TERMS_PATH_BY_LOCALE } from "@/shared/legal";

// Vietnamese Terms at their own URL, so hreflang can pair them with the English
// document as translations of one page rather than as duplicates. The locale is
// fixed by the route, never by a cookie, so the server renders one language.
export const Route = createFileRoute("/vi/dieu-khoan")({
  head: () =>
    buildLegalHead(TERMS_DOCUMENT_VI, "vi", LEGAL_TERMS_PATH_BY_LOCALE),
  component: () => (
    <LegalDocumentPage
      doc={TERMS_DOCUMENT_VI}
      locale="vi"
      pathByLocale={LEGAL_TERMS_PATH_BY_LOCALE}
    />
  ),
});
