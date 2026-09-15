# Security

## Report a vulnerability

Use GitHub's private vulnerability reporting on this repository's Security tab. Include the affected commit, reproduction steps with fictional data, and the expected access boundary. Do not post credentials or student records in public issues.

The maintainer reviews reports as capacity allows. This community project does not promise a response SLA or a bug bounty.

## Deployment boundaries

- The public demo is for fictional data and shared demo accounts.
- Keep DEMO_MODE disabled on databases containing real school records.
- The service-role key belongs on the server. Never prefix it with NEXT_PUBLIC.
- Enable RLS and apply the migrations before serving the application.
- Use your own Supabase project for every independent school deployment.
- Review invitations, backups, retention, permissions, and applicable school requirements before using real records.

Demo accounts have the permissions of the role they represent. The demo is not an isolation boundary between anonymous visitors. Do not use public demo access as real-school authentication.
