# Claude Code Instructions for WayfinderKiosk

## Token Efficiency Guidelines

### Use Subagents for Code Creation
- Delegate code creation tasks to subagents (Sonnet, Haiku) when appropriate
- **Always review and verify** subagent output before considering a task complete
- Use the most token-efficient model for each task type

### Model Selection Guide

| Task Type | Recommended Model | Rationale |
|-----------|-------------------|-----------|
| Simple file creation | Haiku | Low complexity, fast |
| Boilerplate/scaffolding | Haiku | Repetitive patterns |
| Component implementation | Sonnet | Moderate complexity |
| Complex logic/services | Sonnet | Needs careful reasoning |
| Research/exploration | ask-gemini MCP | External knowledge |
| Code review/verification | Opus (main) | Final quality check |
| Architecture decisions | Opus (main) | Critical thinking |

### Available Tools

- **Task tool with subagent_type**: Launch Sonnet/Haiku/Opus agents
- **ask-gemini MCP server**: Available for research and alternative perspectives
- **Explore agent**: For codebase exploration

### Workflow Pattern

1. **Plan** (Opus): Break down task into subtasks
2. **Delegate** (Haiku/Sonnet): Send implementation work to appropriate model
3. **Review** (Opus): Verify all subagent output for correctness
4. **Integrate**: Ensure components work together

### Quality Gates

- All subagent code must be reviewed before committing
- Run type checks and linting after code generation
- Verify accessibility compliance (WCAG 2.2)
- Test SDK integration points manually

---

## Project Configuration

### SDK Credentials
- **Account ID**: `A18L64IIIUQX7L`
- **Venue ID**: `llia`

### Kiosk Location
- **Latitude**: `36.08516393497611`
- **Longitude**: `-115.15065662098584`
- **Floor ID**: `llia-terminal1-departures`
- **Structure ID**: `llia-terminal1`

### POI Categories
- Shop: `shop`
- Dine: `eat`
- Relax: `relax`

### Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- **Zustand** (state management - lightweight, avoids Context re-render issues)
- React Router v6 (hash routing)
- react-i18next (EN, ES, FR)
- **@zxing/library** (camera barcode scanner - supports PDF417 for boarding passes)
- **vite-plugin-pwa** (offline support, service worker caching)
- **Electron** (kiosk shell wrapper for full control)
- Atrius Wayfinder JS SDK

### Critical Implementation Notes
- **Barcode Scanner**: Must use zxing-js, NOT QuaggaJS. Boarding passes use PDF417 (2D barcodes) which QuaggaJS doesn't support.
- **Kiosk Stability**: Error boundaries + global error handler with auto-reload after 3 seconds
- **Touch Gestures**: Electron kiosk mode + CSS `touch-action: manipulation`
- **Inactivity Timer**: Extend timeout during active navigation
- **Single SDK Instance**: Test with one instance first before adding headless
- **Offline Support**: PWA with stale-while-revalidate caching for SDK/API calls
- **State Management**: Use Zustand store, NOT React Context API

### Reference Documents
- `airport-kiosk-planning.md` - Project plan and architecture
- `wayfinder-integration-guide.md` - SDK API reference and implementation examples
