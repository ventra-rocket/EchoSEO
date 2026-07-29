import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/client/features/legal/LegalDocumentPage";
import { buildLegalHead } from "@/client/features/legal/legal-head";
import { TERMS_DOCUMENT } from "@/client/features/legal/legal-content";
import { LEGAL_TERMS_PATH } from "@/shared/legal";

// Public and server-rendered: the sign-up form links here, so the page has to be
// readable before anyone has an account — and before any JavaScript runs.
export const Route = createFileRoute("/terms-and-conditions")({
  head: () => buildLegalHead(TERMS_DOCUMENT, LEGAL_TERMS_PATH),
  component: () => <LegalDocumentPage doc={TERMS_DOCUMENT} />,
});
