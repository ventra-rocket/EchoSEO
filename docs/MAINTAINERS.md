# Maintainers

This document covers maintainer-only workflow notes that do not belong in the public project README.

## Release updates

GitHub Releases are the main user-facing update channel for EchoSEO.

- Ask interested users to watch the repo and enable release notifications.
- Do not treat stars as a contact list; GitHub does not expose a way to message stargazers directly.

## Cutting the first EchoSEO release

**EchoSEO has never tagged a release of its own.** The state to understand
before doing it:

- `git tag` lists `v0.0.1`–`v0.1.6`, but only `v0.0.1`–`v0.0.23` are reachable
  from `main`. Those are the shared history with `every-app/open-seo`.
  `v0.0.24`–`v0.1.6` came in with `git fetch upstream` and point at **upstream**
  commits that are not in our history at all (`v0.1.6` = `cd6a7820`). Verify with
  `git tag --no-merged HEAD`.
- `package.json` `version` is still `0.0.23` — the fork point. There are 261
  non-merge commits on top of it (`git log --no-merges v0.0.23..HEAD`).
- `release-notes/` holds `v0.0.2`–`v0.0.23`, all inherited. Nothing after the
  fork point.
- `scripts/release-notes.mjs` and `release-notes/README.md` are byte-identical to
  upstream's (`git diff HEAD upstream/main -- scripts/release-notes.mjs` is
  empty). Nothing needs porting there.

**Start at `v0.2.0`, not `v0.0.24` or `v0.1.7`.** Every version through `v0.1.6`
is already taken by an upstream tag in this repository, so anything lower either
collides or silently reuses upstream's commit. `v0.2.0` also states plainly that
this is a different product line.

Ordered steps:

1. **Check whether the upstream tags leaked to `origin`:**
   `git ls-remote --tags origin 'refs/tags/v0.0.2[4-9]' 'refs/tags/v0.1.*'`.
   If they are there, decide before tagging: either delete them from `origin`
   (`git push origin --delete v0.1.6 …`) so our tag list means one thing, or
   accept that GitHub's release list will interleave upstream versions with ours.
   Do not delete them locally — `git fetch upstream` brings them straight back.
2. **Bump the version:** set `"version": "0.2.0"` in `package.json`. Do this
   first — `release:notes` derives its default `--from` by looking for the
   highest tag _below_ `package.json`'s version, so a stale `0.0.23` makes it
   choose `v0.0.22` and emit 263 commits' worth of notes.
3. **Generate the notes with an explicit range.** The default would pick
   `v0.1.6`, an upstream tag, and put an uncomparable ref in the changelog link.
   Use the real fork point:

   ```sh
   pnpm -s release:notes -- --from v0.0.23 --to HEAD > release-notes/v0.2.0.md
   ```

4. **Edit `release-notes/v0.2.0.md` by hand.** 261 commits of raw subjects is not
   release notes. Lead with what changed for a user: bilingual VN/EN across every
   surface, the audit engine and export, the free SEO checker, rank tracking with
   GSC actuals, AI visibility. Keep the generated `Full Changelog` line.
5. **Run the gates and commit** the version bump plus the notes file:
   `pnpm run ci:check && pnpm run test:ci`.
6. **Tag and push:**

   ```sh
   git tag -a v0.2.0 -m v0.2.0
   git push origin main --follow-tags
   ```

7. **Publish the release:**

   ```sh
   gh release create v0.2.0 --target main --title v0.2.0 \
     --notes-file release-notes/v0.2.0.md
   ```

8. **Watch the image build.** Pushing a `v*` tag triggers
   `.github/workflows/docker-image.yml`, which publishes
   `ghcr.io/ventra-rocket/echoseo:v0.2.0` and `:latest`. That is the first image
   this repo has ever published — `compose.yaml` and `SELF_HOSTING_DOCKER.md`
   both point at it, so confirm it exists before telling anyone to
   `docker compose pull`.
9. **Make the package public** in the repo's GHCR settings if it defaults to
   private, or a self-hoster's `docker compose pull` gets a 401 rather than a 404.

Afterwards, keep `package.json` `version` ahead of the last tag so step 2 stops
being a manual note.

## Release notes workflow

Generate notes from commits since the latest semver tag:

```sh
pnpm release:notes
```

Useful variants:

```sh
pnpm release:notes -- --from v0.0.1 --to HEAD
pnpm release:notes -- --draft v0.0.2
```

Supported inputs:

- `--from <tag>`: start changelog generation from a specific tag
- `--to <ref>`: end at a specific ref, default is `HEAD`
- `--draft <tag>`: create a GitHub draft release for that tag using the generated notes
- `--repo <owner/repo>`: override the GitHub repo
- `--help`: show help

The generator:

- uses commits since the latest semver tag by default
- filters out maintenance-only commits like `chore:`, `ci:`, `test:`, `build:`, and `release:`
- groups the remaining changes into short user-facing sections
- can create a draft GitHub release when `--draft` is provided

Store finalized notes in `release-notes/` as versioned Markdown files such as `release-notes/v0.0.2.md`.

Recommended release flow:

```sh
pnpm -s release:notes
# edit and save the final copy in release-notes/v0.0.2.md
gh release create v0.0.2 --target main --title v0.0.2 --notes-file release-notes/v0.0.2.md
```

For now, prefer patch releases while the project is still in rapid early development unless there is a clear reason to cut a minor or major release.

## OpenCode slash command

For convenience inside OpenCode, use:

```text
/release-notes
```

The command definition lives at `.opencode/command/release-notes.md` and forwards any extra arguments to the same generator script.
