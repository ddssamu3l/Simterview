# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run dev`: Start the development server with Turbopack
- `npm run build`: Build the application for production
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint to check code quality
- `npm run test`: Run tests with Vitest
- `npm run load-interviews`: Load interview data into the database

## Code Style
- **Imports**: Group imports by: 1) React/Next.js, 2) UI components, 3) utilities/hooks, 4) types
- **Formatting**: Use single quotes, 2-space indentation, and semicolons
- **Types**: Use TypeScript for type safety; prefer explicit type annotations for function parameters/returns
- **Components**: Use functional components with arrow function syntax
- **Naming**: PascalCase for components, camelCase for functions/variables, UPPER_SNAKE_CASE for constants
- **Error Handling**: Use try/catch blocks and toast notifications (from Sonner) for user-facing errors
- **State Management**: Use React hooks (useState, useEffect, useContext) for state management
- **File Structure**: Follow Next.js App Router conventions with (root) and (auth) route groups

Remember to maintain SEO optimization with appropriate metadata in pages and proper alt text for images.