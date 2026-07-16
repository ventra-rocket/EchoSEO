import { createFileRoute } from "@tanstack/react-router";
import { FreeSeoCheckLanding } from "@/client/features/free-seo-check/FreeSeoCheckLanding";
import { buildLandingHead } from "@/client/features/free-seo-check/landing-head";

export const Route = createFileRoute("/free-seo-check")({
  head: () => buildLandingHead("en"),
  component: () => <FreeSeoCheckLanding locale="en" />,
});
