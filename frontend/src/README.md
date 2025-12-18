# Frontend Directory Structure

This project follows Ant Design Pro conventions for better maintainability and consistency.

## Directory Structure

```
src/
├── assets/          # Static assets (images, fonts, etc.)
├── components/      # Reusable UI components
├── config/          # Configuration files
│   ├── constants.ts # Application constants
│   ├── menu.ts      # Menu configuration
│   ├── routes.ts    # Route configuration
│   └── theme.ts     # Theme configuration
├── hooks/           # Custom React hooks
├── layouts/         # Layout components
│   ├── BasicLayout.tsx # Main layout component
│   └── index.ts     # Layout exports
├── pages/           # Page components
├── services/        # API services
├── store/           # State management
├── types/           # TypeScript type definitions
│   ├── api.ts       # API types
│   ├── models.ts    # Data model types
│   ├── pro.ts       # Pro template types
│   └── index.ts     # Type exports
├── utils/           # Utility functions
│   ├── pro.ts       # Pro template utilities
│   └── ...
├── App.tsx          # Main application component
├── main.tsx         # Application entry point
└── config.ts        # Main configuration
```

## Path Aliases

The following path aliases are configured:

- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/pages/*` - src/pages/*
- `@/services/*` - src/services/*
- `@/utils/*` - src/utils/*
- `@/hooks/*` - src/hooks/*
- `@/types/*` - src/types/*
- `@/store/*` - src/store/*
- `@/config/*` - src/config/*
- `@/layouts/*` - src/layouts/*
- `@/assets/*` - src/assets/*

## Testing

- Unit tests: Jest + React Testing Library
- Property-based tests: fast-check
- Test files: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`

## Build Configuration

- Build tool: Vite
- Code splitting: Optimized for Pro components
- Path resolution: Configured for all aliases