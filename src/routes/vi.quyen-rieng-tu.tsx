import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/client/features/legal/LegalDocumentPage";
import { buildLegalHead } from "@/client/features/legal/legal-head";
import { PRIVACY_DOCUMENT_VI } from "@/client/features/legal/legal-content-vi";
import { LEGAL_PRIVACY_PATH_BY_LOCALE } from "@/shared/legal";

// Vietnamese Privacy Policy at its own URL — see the Terms route for why the
// locale rides on the path rather than on a cookie or a query parameter.
export const Route = createFileRoute("/vi/quyen-rieng-tu")({
  head: () =>
    buildLegalHead(PRIVACY_DOCUMENT_VI, "vi", LEGAL_PRIVACY_PATH_BY_LOCALE),
  component: () => (
    <LegalDocumentPage
      doc={PRIVACY_DOCUMENT_VI}
      locale="vi"
      pathByLocale={LEGAL_PRIVACY_PATH_BY_LOCALE}
    />
  ),
});
