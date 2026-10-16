# Knowledge — Security Patterns

Load this for security-focused reviews or any code touching untrusted input,
auth, crypto, or the network. Map findings to OWASP-style categories.

## Injection
- **SQL**: string-concatenated queries, f-strings/template literals in SQL,
  `ORDER BY`/table names taken from input. Fix: parameterized queries, allowlist
  identifiers.
- **Command**: `os.system`, `subprocess` with `shell=True`, `child_process.exec`,
  backticks with interpolation. Fix: pass argv arrays, no shell, validate input.
- **Template/HTML** (XSS): unescaped user data in HTML, `innerHTML`,
  `dangerouslySetInnerHTML`, server-side templates with autoescape off. Fix:
  contextual escaping, CSP, `textContent`.
- **NoSQL / LDAP / XPath**: operator injection via objects (`{$gt:""}`) or
  unescaped filters. Fix: validate types, reject objects where strings expected.
- **Log injection**: user input written to logs unescaped (CRLF, ANSI). Sanitize.

## Authn / Authz
- Missing authorization check on a state-changing endpoint (IDOR): resource
  fetched by id without verifying the caller owns it.
- Client-supplied identity/role/tenant trusted by the server (headers, body
  fields, JWT claims used without signature verification).
- JWT pitfalls: `alg: none`, algorithm confusion, unchecked expiry/audience/issuer.
- Privilege escalation via mass assignment (binding all request fields to a model).
- Session fixation, missing rotation on login, predictable tokens.
- Timing-unsafe comparisons for secrets/tokens.

## Secrets & crypto
- Hardcoded keys, tokens, passwords, private keys; secrets in logs, URLs, or
  error messages; secrets committed to config examples.
- Weak/again-invented crypto: MD5/SHA1 for passwords, ECB mode, static IVs,
  `Math.random()`/`random` for tokens (use CSPRNG), no salt, custom ciphers.
- Unverified TLS (`rejectUnauthorized:false`, `verify=False`), disabled cert checks.
- Insecure random for anything security-relevant.

## Data handling
- Unsafe deserialization (pickle, Java `ObjectInputStream`, YAML `load`,
  `node-serialize`). Fix: safe formats + schema validation.
- Path traversal: joining user input into filesystem paths without normalization
  and a base-dir check (`../`).
- SSRF: server fetches a user-supplied URL without allowlist; blocks cloud
  metadata IP `169.254.169.254`; follows redirects to internal hosts.
- XXE in XML parsers with external entities enabled.
- Zip-slip on archive extraction.
- ReDoS: catastrophic-backtracking regexes run on user input.

## Sensitive data exposure
- PII/credentials in responses, verbose errors, or debug endpoints.
- Over-broad CORS (`Access-Control-Allow-Origin: *` with credentials).
- Missing rate limiting on auth, OTP, and expensive endpoints.
- Files served without authz; directory listing enabled.

## Reporting
For each issue: category, `file:line`, exploit sketch (how an attacker reaches
it), severity, and the concrete fix. Do not reproduce full secret values.
