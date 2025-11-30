# Canvas Knowledge MCP Server - Test Strategy Overview

## 1. Test Pyramid

```
                    ┌─────────────┐
                    │    E2E      │  ← 5-10 scenarios
                    │   Tests     │     (MCP Protocol)
                   ┌┴─────────────┴┐
                   │  Integration   │  ← 30-50 scenarios
                   │    Tests       │     (Tools + Engine)
                  ┌┴───────────────┴┐
                  │    Unit Tests    │  ← 150-200 scenarios
                  │   (Engine/Types) │     (Core Logic)
                 └───────────────────┘
```

## 2. Test Coverage Goals

| Layer | Target Coverage | Priority |
|-------|-----------------|----------|
| Engine (core logic) | 90%+ | Critical |
| Tools (MCP handlers) | 80%+ | High |
| Types (validation) | 70%+ | Medium |
| Server (protocol) | 60%+ | Medium |

## 3. Test Categories

### 3.1 Unit Tests
- **Location:** `src/__tests__/unit/`
- **Framework:** Vitest
- **Scope:** Single function/method isolation
- **Mocking:** File system, external dependencies

### 3.2 Integration Tests
- **Location:** `src/__tests__/integration/`
- **Framework:** Vitest
- **Scope:** Multiple components working together
- **Fixtures:** Real file structures in `src/__tests__/fixtures/`

### 3.3 E2E Tests
- **Location:** `src/__tests__/e2e/`
- **Framework:** Vitest + MCP Test Client
- **Scope:** Full MCP protocol round-trip

## 4. Test File Structure

```
src/
├── __tests__/
│   ├── fixtures/
│   │   ├── canvases/
│   │   │   ├── empty.canvas
│   │   │   ├── simple-topic.canvas
│   │   │   ├── complex-layout.canvas
│   │   │   └── corrupted.canvas
│   │   ├── vault/
│   │   │   ├── note1.md
│   │   │   ├── note2.md
│   │   │   └── nested/
│   │   │       └── note3.md
│   │   └── meta/
│   │       └── sample.meta.json
│   ├── helpers/
│   │   ├── mock-fs.ts
│   │   ├── canvas-factory.ts
│   │   └── mcp-client.ts
│   ├── unit/
│   │   ├── engine/
│   │   │   ├── canvas-parser.test.ts
│   │   │   ├── layout-engine.test.ts
│   │   │   ├── semantic-router.test.ts
│   │   │   ├── meta-manager.test.ts
│   │   │   ├── vault-indexer.test.ts
│   │   │   └── cross-reference.test.ts
│   │   └── types/
│   │       ├── canvas.test.ts
│   │       └── semantic.test.ts
│   ├── integration/
│   │   ├── canvas-tools.test.ts
│   │   ├── vault-tools.test.ts
│   │   ├── dashboard-tools.test.ts
│   │   └── workflow.test.ts
│   └── e2e/
│       ├── mcp-protocol.test.ts
│       └── full-workflow.test.ts
```

## 5. Test Naming Convention

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {});
    it('should throw [ErrorType] when [invalid condition]', () => {});
    it('should return [expected value] given [input]', () => {});
  });
});
```

## 6. Test Data Strategy

### 6.1 Fixtures
- Static test data in `fixtures/` directory
- JSON Canvas spec compliant files
- Various edge case scenarios

### 6.2 Factories
- Dynamic test data generation
- Randomized but valid inputs
- Property-based testing support

### 6.3 Mocks
- File system operations (memfs/mock-fs)
- UUID generation (deterministic)
- Date/time (fixed timestamps)

## 7. CI/CD Integration

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run lint
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v3
```

## 8. Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- canvas-parser

# Run in watch mode
npm run test:watch

# Run only unit tests
npm test -- --dir src/__tests__/unit

# Run only integration tests
npm test -- --dir src/__tests__/integration
```

## 9. Documentation Files

| File | Description |
|------|-------------|
| `01-canvas-parser.md` | CanvasParser unit test specs |
| `02-layout-engine.md` | LayoutEngine unit test specs |
| `03-semantic-router.md` | SemanticRouter unit test specs |
| `04-meta-manager.md` | MetaManager unit test specs |
| `05-vault-indexer.md` | VaultIndexer unit test specs |
| `06-cross-reference.md` | CrossReferenceManager unit test specs |
| `07-canvas-tools.md` | CanvasTools integration test specs |
| `08-vault-tools.md` | VaultTools integration test specs |
| `09-dashboard-tools.md` | DashboardTools integration test specs |
| `10-server.md` | MCP Server integration test specs |
| `11-e2e.md` | End-to-end test specs |

## 10. Quality Gates

- All tests must pass
- Coverage must not decrease
- No skipped tests in main branch
- Performance benchmarks must pass
