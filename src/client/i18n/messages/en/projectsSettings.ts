// Project list, create/rename/archive flows and the workspace settings route.
export const projectsSettings = {
  // Projects list route (src/routes/_app/projects.tsx). The heading is reused
  // by ProjectSettings.tsx's back link — both name the same destination.
  "projectsSettings.page.title": "Projects",
  "projectsSettings.page.subtitle":
    "Each project is a separate workspace with its own Search Console, rank tracking, and audits.",
  // Reused by the trigger button here and by CreateProjectModal's own heading:
  // opening the modal and the modal's title name the same action.
  "projectsSettings.newProject.action": "New project",

  // Archived projects (ProjectsPage's ArchivedProjects section).
  "projectsSettings.archived.heading": "Archived",
  "projectsSettings.archived.noDomain": "No domain set",
  "projectsSettings.archived.restore": "Restore",
  "projectsSettings.archived.restoreSuccess": "Project restored",
  "projectsSettings.archived.restoreError": "Failed to restore project",

  // CreateProjectModal.tsx
  "projectsSettings.createProject.hint":
    "You can connect Search Console and set up rank tracking after creating the project.",
  "projectsSettings.createProject.submit": "Create project",
  "projectsSettings.createProject.success": "Project created",
  "projectsSettings.createProject.error": "Failed to create project",

  // Name/Domain field labels, shared verbatim by CreateProjectModal.tsx and
  // ProjectSettings.tsx's GeneralSection — one project name, one wording.
  "projectsSettings.field.name": "Name",
  "projectsSettings.field.namePlaceholder": "Acme Inc.",
  "projectsSettings.field.domain": "Domain",
  "projectsSettings.field.domainOptional": "(optional)",
  "projectsSettings.field.domainPlaceholder": "example.com",

  // Shared across both project forms above.
  "projectsSettings.validation.nameRequired": "Project name is required",
  "projectsSettings.action.cancel": "Cancel",

  // Project settings route (ProjectSettings.tsx)
  "projectsSettings.route.heading": "Project settings",
  "projectsSettings.section.searchConsole": "Search Console",
  "projectsSettings.section.general": "General",
  "projectsSettings.general.save": "Save changes",
  "projectsSettings.general.updateSuccess": "Project updated",
  "projectsSettings.general.updateError": "Failed to update project",

  // Danger zone (ProjectSettings.tsx's DangerSection). The title is reused by
  // both the section heading and the non-confirming trigger button below it.
  "projectsSettings.danger.title": "Archive project",
  "projectsSettings.danger.canArchiveHint":
    "Archive this project to remove it from your workspace.",
  "projectsSettings.danger.cannotArchiveHint":
    "You can't archive your only project.",
  "projectsSettings.danger.confirmBody":
    "Archiving <b>{name}</b> removes it from your workspace and stops its scheduled rank tracking. You can restore it later from the Projects page.",
  "projectsSettings.danger.confirmButton": "Yes, archive project",
  "projectsSettings.danger.archiveSuccess": "Project archived",
  "projectsSettings.danger.archiveError": "Failed to archive project",

  // Workspace settings route (src/routes/_app/settings.tsx). The page heading
  // reuses the shipped `account.settings` id instead of a second "Settings"
  // copy; the theme row reuses `common.theme.*`. Only Appearance's section
  // eyebrow and the whole Analytics section are new here.
  "projectsSettings.settings.appearance": "Appearance",
  "projectsSettings.settings.analytics": "Analytics",
  "projectsSettings.settings.analyticsPitch": "Help improve EchoSEO",
  "projectsSettings.settings.analyticsDescription":
    "Share analytics and usage data.",
  "projectsSettings.settings.analyticsToggleAria": "Enable product analytics",
  "projectsSettings.settings.analyticsUpdateError":
    "We couldn't update your analytics setting.",
  "projectsSettings.settings.analyticsEnabledToast": "Analytics enabled",
  "projectsSettings.settings.analyticsDisabledToast": "Analytics disabled",
} as const;
