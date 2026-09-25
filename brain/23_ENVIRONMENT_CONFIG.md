# 23 Environment Configuration

## Required variables

```env
NODE_ENV=development
DEMO_MODE=true
SIMULATION_ENABLED=true
SIMULATION_SPEED=5

DATABASE_URL=
AUTH_SECRET=

MAP_PROVIDER=
MAP_API_KEY=

NOTIFICATION_PROVIDER_MODE=mock
WHATSAPP_API_KEY=
SMS_API_KEY=
EMAIL_API_KEY=

NEXT_PUBLIC_APP_URL=
```

## Optional variables

```env
REDIS_URL=
REALTIME_TRANSPORT=sse
STALE_GPS_MINUTES=20
NO_MOVEMENT_MINUTES=30
HUB_DWELL_WARNING_MINUTES=45
HUB_DWELL_CRITICAL_MINUTES=90
ROUTE_DEVIATION_METERS=1000
ETA_NOTIFICATION_DELTA_MINUTES=30
```

## Rules

- Never commit `.env`.
- Commit only `.env.example`.
- Use separate values per environment.
- Real credentials are prohibited in demo mode.
