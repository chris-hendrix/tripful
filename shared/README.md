# @tripful/shared

Shared TypeScript types, Zod schemas, and utilities used across the Tripful monorepo.

## Package Structure

```
shared/
├── index.ts           # Main barrel export
├── types/            # TypeScript type definitions
│   ├── index.ts
│   └── user.ts
├── schemas/          # Zod validation schemas
│   ├── index.ts
│   └── auth.ts
└── utils/            # Utility functions
    └── index.ts
```

## Usage

Import from the package root:

```typescript
import { User, phoneNumberSchema, convertToUTC } from "@tripful/shared";
```

Or import from specific subpaths:

```typescript
import { User } from "@tripful/shared/types";
import { phoneNumberSchema } from "@tripful/shared/schemas";
import { convertToUTC } from "@tripful/shared/utils";
```

## Development Notes

### Module Resolution

This package uses TypeScript with **no file extensions** in import paths, despite using `"moduleResolution": "NodeNext"`. This is intentional to support Next.js's `transpilePackages` feature.

**Why no `.js` extensions?**

- Next.js with `transpilePackages` cannot resolve `.js` extensions when importing from TypeScript source files
- Removing extensions allows Next.js to transpile the package correctly
- TypeScript will show warnings (TS2835) about missing extensions - these are cosmetic and can be ignored

**Example:**

```typescript
// ✅ Correct (works with Next.js transpilation)
export { User } from "./types/index";

// ❌ Incorrect (breaks Next.js module resolution)
export { User } from "./types/index.js";
```

### Adding New Exports

When adding new types, schemas, or utils:

1. Create the file in the appropriate directory
2. Export from the directory's `index.ts` **without** `.js` extension
3. Re-export from the root `index.ts` if needed for convenience

**Example:**

```typescript
// In schemas/profile.ts
export const profileSchema = z.object({ ... });

// In schemas/index.ts
export { profileSchema } from './profile';  // No .js extension

// Optionally in root index.ts
export { profileSchema } from './schemas/index';  // No .js extension
```

## Testing

Run tests:

```bash
pnpm test          # Run once
pnpm test:watch    # Watch mode
```

## Type Checking

```bash
pnpm typecheck
```

Note: TypeScript may show warnings about missing `.js` extensions (TS2835). These can be safely ignored as the code compiles and runs correctly with Next.js transpilation.

## Linting

```bash
pnpm lint
```
