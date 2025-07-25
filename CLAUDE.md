# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **assistant-ui**, an open-source TypeScript/React library for AI chat interfaces. It's a monorepo containing multiple packages that work together to provide comprehensive AI chat functionality with support for multiple AI providers, streaming responses, and customizable UI components.

## Development Commands

### Primary Commands
- `pnpm docs:dev` - Start the documentation development server
- `pnpm test` - Run tests across all packages using Turbo
- `pnpm prettier` - Check code formatting
- `pnpm prettier:fix` - Fix code formatting issues
- `turbo build` - Build all packages
- `turbo lint` - Lint all packages
- `turbo test` - Run tests with Turbo orchestration

### Package-Specific Commands
Each package has its own commands accessible via `pnpm --filter=<package-name> <command>`:
- `pnpm --filter=@assistant-ui/react build` - Build the main React package
- `pnpm --filter=@assistant-ui/react test` - Test the main React package
- `pnpm --filter=@assistant-ui/react lint` - Lint the main React package

## Core Architecture

### Runtime System (3-Tier Architecture)
1. **Local Runtime** (`packages/react/src/runtimes/local/`) - Direct AI model integration with local state management
2. **External Store Runtime** (`packages/react/src/runtimes/external-store/`) - Integration with external state management systems
3. **Cloud Runtime** (`packages/react/src/cloud/`) - Cloud-based AI services with distributed persistence

### Key Packages
- **`@assistant-ui/react`** - Core React components and runtime system
- **`@assistant-ui/react-ai-sdk`** - Integration with Vercel AI SDK
- **`@assistant-ui/react-langgraph`** - LangGraph integration
- **`@assistant-ui/assistant-stream`** - Streaming protocol handling
- **`@assistant-ui/react-markdown`** - Markdown rendering components
- **`@assistant-ui/cloud`** - Cloud service integration

### Component Architecture
The library follows a **primitive component pattern** inspired by Radix UI:
- **Headless primitives** in `packages/react/src/primitives/` provide behavior without styling
- Components are organized by domain: `thread/`, `message/`, `composer/`, `actionBar/`, `attachment/`
- Each primitive exposes composable sub-components (e.g., `ThreadRoot`, `ThreadMessages`, `ThreadViewport`)

### Context System
Nested React context providers manage state:
- `AssistantRuntimeProvider` - Top-level runtime context
- `ThreadRuntimeProvider` - Conversation thread context
- `MessageRuntimeProvider` - Individual message context
- `ComposerRuntimeProvider` - Input composition context

### Streaming & Real-time Updates
- Uses **subscribable pattern** with `BaseSubject`, `NestedSubscriptionSubject`, and `ShallowMemoizeSubject`
- Real-time message streaming through `ChatModelRunResult` and `ThreadAssistantMessagePart`
- Automatic UI updates via context subscriptions

## Monorepo Structure

This is a **pnpm workspace** with packages organized in:
- `packages/` - Core library packages
- `apps/` - Documentation and registry apps
- `examples/` - Example implementations
- `python/` - Python integrations

## Testing

- Uses **Vitest** for unit testing
- **Stryker** for mutation testing in core packages
- Integration tests in `packages/react/INTEGRATION_TEST_README.md`
- Test files co-located with source code

## Build System

- **Turbo** for build orchestration across packages
- **TypeScript** with strict configuration
- **ESM-only** builds with proper package.json exports
- Custom build scripts in `scripts/build.mts` for each package

## Code Style

- **Prettier** with Tailwind CSS plugin for formatting
- **ESLint** with Next.js configuration
- Trailing commas enforced
- Uses pnpm workspaces for dependency management

## Key Patterns

### Adapter Pattern
External integrations use adapters:
- `ChatModelAdapter` for AI model integration
- `AttachmentAdapter` for file handling
- `SpeechAdapter` for voice capabilities

### Message Repository Pattern
External state integration through `MessageRepository` interface for pluggable message storage.

### Subscribable State Management
All state changes flow through subscribable subjects enabling reactive UI updates with performance optimizations.