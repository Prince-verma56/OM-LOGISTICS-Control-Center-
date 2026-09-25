# 21 Roles and Permissions

## Roles

| Capability | OPS_AGENT | OPS_MANAGER | CUSTOMER_SUPPORT | ADMIN | PUBLIC |
|---|---:|---:|---:|---:|---:|
| View dashboard | Yes | Yes | Limited | Yes | No |
| View shipments | Yes | Yes | Yes | Yes | No |
| View fleet | Yes | Yes | Limited | Yes | No |
| View hubs | Yes | Yes | Limited | Yes | No |
| Create/assign exceptions | Yes | Yes | No | Yes | No |
| Resolve exceptions | Yes | Yes | No | Yes | No |
| View KPIs | Limited | Yes | No | Yes | No |
| Manage users | No | No | No | Yes | No |
| Manage integrations | No | No | No | Yes | No |
| Public tracking | No | No | No | No | Yes |

## Field-level restrictions

Public tracking should not return:
- internal exception notes;
- operational assignee;
- vehicle GPS precision finer than the approved privacy policy;
- customer contact information;
- internal system identifiers.

Exact privacy rules should be reviewed before production.
