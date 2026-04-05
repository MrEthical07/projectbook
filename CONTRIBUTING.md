# Contributing to ProjectBook

## Setup

```bash
pnpm install
pnpm run dev
```

## Rules

- No service layer.
- No command pattern.
- Use remote functions as the data boundary.
- No direct data imports in page components.
- Follow the existing folder and route structure.

## Pull Request Guidelines

- Use a clear title that describes the change.
- Keep one feature/fix per PR.
- Do not include unrelated changes.
- Ensure the project builds successfully before requesting review.

## Before Opening a PR

```bash
npm run check
npm run build
```
