<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:tracking-rules -->
# Tracking Rules (Testing Phase)

- Track every interactive element on the site: buttons, links, text inputs, navigation.
- For this testing phase, capture input values in plain text so the team can view them in the admin dashboard.
- Do NOT mask or hash passwords/usernames during testing.
- Before any public launch, revisit this rule and add safety checks (masking, encryption, consent, legal review).
<!-- END:tracking-rules -->
