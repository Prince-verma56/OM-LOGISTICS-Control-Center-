# 09 Error Handling

## 1. Error categories

### Client errors
- invalid filters;
- invalid IDs;
- bad form values.

### Integration errors
- source timeout;
- malformed source data;
- stale source;
- unavailable connector.

### Domain errors
- invalid status transition;
- duplicate event;
- exception already resolved.

### System errors
- database failure;
- unexpected application error.

## 2. Standard API error structure

```json
{
  "error": {
    "code": "INTEGRATION_TIMEOUT",
    "message": "GPS source timed out.",
    "requestId": "req_123",
    "retryable": true
  }
}
```

## 3. UI behavior

Do not display raw stack traces.

For retryable errors:
- show friendly error;
- show retry action;
- preserve current filters.

For stale data:
- do not show a generic system-error page;
- show stale indicator;
- show last updated timestamp.

## 4. Retry policy

Retry safe GET/read calls only.

Do not blindly retry state-changing actions.

## 5. Logging

Every backend error log should contain:
- timestamp;
- level;
- requestId;
- userId if authenticated;
- route;
- error code;
- stack trace in server logs only.

## 6. State transitions

Allowed exception transitions:
```text
OPEN -> IN_PROGRESS
OPEN -> RESOLVED
OPEN -> DISMISSED
IN_PROGRESS -> RESOLVED
IN_PROGRESS -> DISMISSED
```

Prevent invalid transitions.
