# Contributing

Thanks for helping make school software easier to build and adapt.

## Start small

Check existing issues before starting. For a substantial feature, describe the school workflow, who needs it, and what a successful result looks like in an issue. Documentation, accessibility, localization, and reproducible bug reports are useful contributions too.

## Development

Follow the README setup with your own Supabase project and fictional data. Create a branch, make one focused change, and run the relevant checks from the README. Include mobile verification for layout changes and access-control verification for changes to data or roles.

Open a pull request that explains:

- The problem and the resulting behavior.
- How you tested it, including screenshots when the interface changes.
- Any database migration or new environment variable.

Do not include real student records, credentials, database exports, generated logs, or local editor state. Describe security vulnerabilities privately using SECURITY.md.

## Product conventions

Parent views stay scoped to that parent's students. Teacher views stay scoped to assigned classes. Use the database's class catalog availability for capacity figures. Keep migrations ordered and school-facing dates in America/New_York.

Use clear, respectful language in issues and reviews. Harassment and publication of other people's private information are not acceptable. Report conduct concerns privately through the maintainer's GitHub profile contact options.

By submitting a contribution, you agree to license your original contribution under this project's MIT license and confirm that you have the right to do so.
