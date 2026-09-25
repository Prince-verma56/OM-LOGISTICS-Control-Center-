# 10 Security

## 1. Authentication

Use an established authentication mechanism suitable for the deployment environment.

Roles:
- OPS_AGENT
- OPS_MANAGER
- CUSTOMER_SUPPORT
- ADMIN
- CUSTOMER_PUBLIC

## 2. Authorization

Every internal API route must validate the authenticated user's role.

Examples:
- customer support can view shipment status;
- operations can manage exceptions;
- admin can manage integrations/users.

## 3. Customer tracking

Public tracking:
- uses random high-entropy tracking tokens;
- exposes limited fields;
- has optional rate limiting;
- never reveals internal IDs.

## 4. Secrets

Never commit:
- database password;
- API keys;
- auth secrets;
- messaging tokens;
- map provider secrets.

Use environment variables/secret manager.

## 5. Input validation

Validate:
- query params;
- route params;
- JSON bodies;
- imported data.

Use Zod.

## 6. Audit log

Record:
- login/security events;
- exception assignments;
- exception status changes;
- alert configuration changes;
- integration configuration changes.

## 7. Data minimization

The customer-facing API should not expose operational metadata that is not necessary for tracking.

## 8. Security headers

Configure:
- CSP where practical;
- frame protection;
- content type protection;
- secure cookies;
- strict transport in production.

## 9. Rate limiting

Recommended for:
- public tracking;
- login;
- notification test endpoints;
- import endpoints.

## 10. Demo restriction

Any endpoint that can send a real notification must be disabled in DEMO_MODE unless explicitly enabled by configuration.
