import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/client/features/legal/LegalDocumentPage";
import { buildLegalHead } from "@/client/features/legal/legal-head";
import { PRIVACY_DOCUMENT } from "@/client/features/legal/legal-content";
import { LEGAL_PRIVACY_PATH } from "@/shared/legal";

// Public and server-rendered, for the same reason as the Terms: it is linked
// from sign-up and has to be readable by someone who is not signed in.
export const Route = createFileRoute("/privacy")({
  head: () => buildLegalHead(PRIVACY_DOCUMENT, LEGAL_PRIVACY_PATH),
  component: () => <LegalDocumentPage doc={PRIVACY_DOCUMENT} />,
});
