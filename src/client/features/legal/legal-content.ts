/**
 * The English source text of the Terms and the Privacy Policy.
 *
 * Every factual claim here was checked against the code that implements it —
 * retention windows against `features/audit/retention.ts` and
 * `services/seo-check/retention.ts`, the Search Console scope against
 * `webmasters.readonly`, the sub-processor list against the secrets actually
 * configured on the deployment. A legal page that describes behavior the service
 * does not have is worse than no page, so when a claim could not be verified it
 * is written narrowly or left out rather than guessed at.
 *
 * Vietnamese translations are deliberately not here yet. Two legal texts that
 * drift apart are a real liability, so the second language lands as its own
 * change with its own review, not as a rushed mirror of this one.
 */
import { LEGAL_CONTACT_EMAIL } from "@/shared/legal";

export type LegalBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  /** Term/definition pairs — how the retention and sub-processor rows read. */
  | { kind: "definitions"; entries: { term: string; description: string }[] };

interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  /** `<h1>` and the basis of the `<title>`. */
  title: string;
  /** One-line summary under the title, and the meta description. */
  summary: string;
  sections: LegalSection[];
}

const SERVICE_DESCRIPTION =
  "EchoSEO is an SEO analysis service. It offers an anonymous checker that scores a single public page, and a signed-in workspace that crawls a site you control, reports issues, and can read your Google Search Console data.";

export const TERMS_DOCUMENT: LegalDocument = {
  title: "Terms and Conditions",
  summary:
    "The agreement between you and EchoSEO when you use the hosted service at echoseo.ventrarocket.vn.",
  sections: [
    {
      heading: "Who we are",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO is a project operated by VentraRocket from Vietnam. These Terms govern your use of the hosted service at echoseo.ventrarocket.vn. By creating an account or submitting a check, you accept them.",
        },
        {
          kind: "paragraph",
          text: "The EchoSEO software is open source under the MIT licence. These Terms cover only the hosted service we run. If you or someone else self-hosts EchoSEO, that deployment is operated by whoever runs it, and this agreement does not apply to it.",
        },
      ],
    },
    {
      heading: "What the service does",
      blocks: [
        { kind: "paragraph", text: SERVICE_DESCRIPTION },
        {
          kind: "paragraph",
          text: "EchoSEO reports what it observes and suggests changes. It does not control search engines. Nothing here is a promise of any ranking, traffic level, or indexing outcome, and no part of the service should be read as legal, financial, or professional advice.",
        },
      ],
    },
    {
      heading: "Your account",
      blocks: [
        {
          kind: "list",
          items: [
            "You must give an email address you actually control, and keep your sign-in credentials secure.",
            "You are responsible for everything done under your account, including by people you invite into your workspace.",
            "A workspace owner can see and manage the projects, audits, and members in that workspace. Only invite people you intend to give that access.",
            "You must be at least 16 years old to create an account.",
          ],
        },
      ],
    },
    {
      heading: "Acceptable use",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO fetches pages from the web on your instruction. That capability is the part most open to misuse, so these limits are strict.",
        },
        {
          kind: "list",
          items: [
            "Only run a site audit against a site you own or are authorised to analyse. Search Console verification is how the service checks this for audits, and you must not work around it.",
            "Do not use EchoSEO to overload, disrupt, or probe a site you do not control, or as a component of any attack.",
            "Do not attempt to defeat rate limits, quotas, bot checks, or the boundary between workspaces.",
            "Do not use the service to process unlawful content, or to send unsolicited mail to addresses that are not yours.",
            "Do not resell the hosted service as your own. You are free to self-host the MIT-licensed software instead.",
          ],
        },
        {
          kind: "paragraph",
          text: "We may suspend an account that breaks these limits, without notice where the misuse is ongoing.",
        },
      ],
    },
    {
      heading: "Your sites and your data",
      blocks: [
        {
          kind: "paragraph",
          text: "You keep all rights to your sites, your content, and the data you connect. By using the service you permit us to fetch, store, and analyse that material for the purpose of producing your reports.",
        },
        {
          kind: "paragraph",
          text: "If you connect Google Search Console, EchoSEO requests read-only access. It can read your search performance and index status; it cannot submit, change, or delete anything in your Search Console property. You can disconnect at any time from your Google account settings.",
        },
        {
          kind: "paragraph",
          text: "Where the service can act outside EchoSEO — submitting your URLs to IndexNow, for example — it does so only when you explicitly ask it to, and only for a site you have proved you control.",
        },
      ],
    },
    {
      heading: "Price",
      blocks: [
        {
          kind: "paragraph",
          text: "The service is currently free to use. We are not selling a paid plan today and we do not take payment details. If that changes, we will publish payment, renewal, and refund terms here and make them clear before anyone is asked to pay. You will never be charged under the present version of these Terms.",
        },
      ],
    },
    {
      heading: "Availability and changes",
      blocks: [
        {
          kind: "paragraph",
          text: "EchoSEO is offered as-is and as-available, with no uptime commitment. It is early software: features may change or be withdrawn, checks may be rate-limited or paused, and background work can fail. We keep backups of the platform but you should not treat EchoSEO as the only copy of anything you care about.",
        },
      ],
    },
    {
      heading: "Ending the agreement",
      blocks: [
        {
          kind: "paragraph",
          text: `You may stop using the service at any time and ask us to delete your account by writing to ${LEGAL_CONTACT_EMAIL}. We may end or suspend access if these Terms are broken, or if we discontinue the hosted service. Data is removed as described in the Privacy Policy.`,
        },
      ],
    },
    {
      heading: "Liability",
      blocks: [
        {
          kind: "paragraph",
          text: "To the extent the law allows, EchoSEO and VentraRocket are not liable for lost profit, lost traffic, lost rankings, lost data, or any indirect or consequential loss arising from your use of the service. Because the hosted service is provided free of charge, our total liability to you is limited to putting the service right or ending your account. Nothing here excludes liability that cannot lawfully be excluded.",
        },
      ],
    },
    {
      heading: "Changes to these Terms",
      blocks: [
        {
          kind: "paragraph",
          text: "We may update these Terms. The date at the top of this page always reflects the current version. If a change materially reduces your rights, we will give notice by email to account holders before it takes effect. Continuing to use the service after that means you accept the new version.",
        },
      ],
    },
    {
      heading: "Governing law",
      blocks: [
        {
          kind: "paragraph",
          text: "These Terms are governed by the laws of Vietnam. We would rather resolve a problem by email than by process, so please contact us first.",
        },
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  title: "Privacy Policy",
  summary:
    "What EchoSEO collects when you use the hosted service, why, how long it is kept, and who else sees it.",
  sections: [
    {
      heading: "Scope",
      blocks: [
        {
          kind: "paragraph",
          text: "This policy covers the hosted service at echoseo.ventrarocket.vn, operated by VentraRocket from Vietnam. A self-hosted EchoSEO deployment is controlled entirely by whoever runs it; we receive nothing from it and this policy does not describe it.",
        },
      ],
    },
    {
      heading: "What we collect, and why",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Account details",
              description:
                "Your email address, your name if you give one, and either a hashed password or the basic Google profile you sign in with. Needed to have an account at all.",
            },
            {
              term: "Workspace details",
              description:
                "Your workspace name, who belongs to it, and the email addresses you type in to invite people. An invitation email is sent to the address you enter, so only enter addresses of people expecting one.",
            },
            {
              term: "Sites and audit results",
              description:
                "The site addresses you add, the pages crawled from them, the links between those pages, the issues found, and any evidence screenshots you ask the service to capture.",
            },
            {
              term: "Google Search Console data",
              description:
                "If you connect it: search performance figures and index status for the property you connected, read under a read-only grant. The access token is stored in our database so the connection keeps working, and stops working the moment you revoke it in your Google account.",
            },
            {
              term: "Free checker submissions",
              description:
                "The URL you asked us to check. For the deep report only, the email address you supply and the time you confirmed it. The quick check needs no email — its cache is keyed by hostname, and the result you saw is kept under the unguessable share link the checker gives you so that link keeps working.",
            },
            {
              term: "Technical data",
              description:
                "Ordinary request and error logs. Rate-limit counters are keyed by IP address but live only in expiring in-memory counters; your IP is never written to our database or file storage.",
            },
          ],
        },
      ],
    },
    {
      heading: "A checked URL can itself be personal data",
      blocks: [
        {
          kind: "paragraph",
          text: "A staging, unlisted, or internal address tells us something about the person who submitted it. We therefore treat the URLs you give us with the same care as your email address.",
        },
      ],
    },
    {
      heading: "What we do not do",
      blocks: [
        {
          kind: "list",
          items: [
            "We do not sell or rent your personal data, and we never have.",
            "We do not use your data or your site content to train AI models.",
            "We run no advertising trackers and no third-party analytics on this deployment. The software can be configured to send product analytics, and that configuration is switched off here.",
          ],
        },
      ],
    },
    {
      heading: "Why we are allowed to hold it",
      blocks: [
        {
          kind: "paragraph",
          text: "For an account, because we need the data to provide the service you asked for. For the free deep report, consent: submitting the form starts nothing, and a check begins only when you click the confirmation link we email you. That double opt-in is also what stops the form being used to mail somebody else.",
        },
      ],
    },
    {
      heading: "How long we keep it",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Free deep report and the email that requested it",
              description:
                "30 days, measured from when the report finished rather than when it was requested. A report still running is never deleted.",
            },
            {
              term: "A free-checker request that was never confirmed",
              description:
                "7 days after its confirmation link expires. Links last 24 hours. This exists so the addresses of people who never consented are not the ones we keep longest.",
            },
            {
              term: "Screenshot of a checked site",
              description: "7 days from capture.",
            },
            {
              term: "Shared result link of a quick check",
              description:
                "30 days from the check. The link stops working when its snapshot is deleted; it holds only the public page data the result showed, never an email address.",
            },
            {
              term: "Audit evidence screenshots",
              description: "30 days from capture.",
            },
            {
              term: "Audit export files",
              description: "7 days after the export is built.",
            },
            {
              term: "Audit crawls",
              description: "90 days by default.",
            },
            {
              term: "Account and workspace records",
              description:
                "Until you ask us to delete them. Deleting a record cascades to the reports and stored files that belong to it.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Deletion runs as a daily sweep. It processes a bounded number of records per run, so a large backlog drains over several days rather than in one pass. If a check is interrupted so badly that it never reaches a finished state, it has no deletion deadline and will stay until someone asks us to remove it — write to us and we will.",
        },
      ],
    },
    {
      heading: "Who else sees your data",
      blocks: [
        {
          kind: "definitions",
          entries: [
            {
              term: "Cloudflare",
              description:
                "Hosting, database, file storage, and the anti-bot check on the public form. Technically sees everything the service stores.",
            },
            {
              term: "Google",
              description:
                "PageSpeed Insights receives the URL being checked, never your email. If you sign in with Google or connect Search Console, Google necessarily sees that you did.",
            },
            {
              term: "Resend",
              description:
                "Receives your email address and the message, to deliver account mail and report links.",
            },
            {
              term: "IndexNow participants",
              description:
                "Bing and Yandex receive the URLs you explicitly choose to submit. Google does not participate in IndexNow.",
            },
            {
              term: "DataForSEO",
              description:
                "Used for competitive keyword and backlink data, and only when the operator supplies an API key. No key is configured on this deployment, so no data reaches DataForSEO today.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "These providers operate outside Vietnam, so using the service involves your data being processed abroad. We disclose data to no one else, other than where the law requires it.",
        },
      ],
    },
    {
      heading: "Cookies",
      blocks: [
        {
          kind: "paragraph",
          text: "Signing in sets a session cookie so you stay signed in; that is what it is for and it does nothing else. The public checker form runs a Cloudflare anti-bot check, which sets its own short-lived cookie. There are no advertising or cross-site tracking cookies.",
        },
      ],
    },
    {
      heading: "Report links",
      blocks: [
        {
          kind: "paragraph",
          text: "A free deep report lives at an address containing a long unguessable identifier. That link is the key: it is excluded from search engines and cannot be guessed, but anyone you forward it to can open the report without signing in. Treat it as you would a private document link, and tell us if you want one retired early.",
        },
      ],
    },
    {
      heading: "Your rights",
      blocks: [
        {
          kind: "paragraph",
          text: `Write to ${LEGAL_CONTACT_EMAIL} and we will tell you what we hold for your address, correct it, delete it ahead of the retention window, or record that you have withdrawn consent. We handle these by hand today rather than through a self-service screen; the volume does not yet justify automating it. We aim to respond within 30 days.`,
        },
      ],
    },
    {
      heading: "Security",
      blocks: [
        {
          kind: "paragraph",
          text: "The service is served over HTTPS only. Credentials and provider keys are held in encrypted secret storage, never in the source code. Passwords are stored hashed. No service is immune to compromise, and we will tell affected users promptly if one occurs here.",
        },
      ],
    },
    {
      heading: "Changes and contact",
      blocks: [
        {
          kind: "paragraph",
          text: `The date at the top of this page reflects the current version. If a change materially affects how we handle your data, we will notify account holders by email before it takes effect. Questions go to ${LEGAL_CONTACT_EMAIL}.`,
        },
      ],
    },
  ],
};
