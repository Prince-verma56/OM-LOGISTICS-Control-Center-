# 12 GitHub Actions

## 1. CI pipeline

Run on pull requests and main branch.

Steps:
1. checkout;
2. install dependencies;
3. typecheck;
4. lint;
5. unit tests;
6. build;
7. optional integration tests.

## 2. Suggested workflow

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --runInBand
      - run: npm run build
```

The Node version is a proposed project baseline. Keep it aligned with the supported runtime selected for the deployment.

## 3. Branch strategy

```text
main
  |
  +-- feature/*
  +-- fix/*
  +-- chore/*
```

## 4. Pull request checks

Required before merge:
- tests passing;
- lint passing;
- typecheck passing;
- build passing;
- no committed secrets.
