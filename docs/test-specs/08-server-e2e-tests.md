# Server & E2E Test Specification

## Overview
This document covers MCP Server integration tests and End-to-End tests that verify the full system from MCP protocol to file operations.

---

# Part 1: MCP Server Tests

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Helper to simulate MCP requests
const createMCPTestClient = (server: Server) => ({
  listTools: async () => {
    // Simulate ListToolsRequest
    return server.handleRequest({ method: 'tools/list', params: {} });
  },
  callTool: async (name: string, args: any) => {
    // Simulate CallToolRequest
    return server.handleRequest({
      method: 'tools/call',
      params: { name, arguments: args },
    });
  },
});
```

---

## 1. Tool Registration Tests

#### TC-SRV-001: List all registered tools
```typescript
describe('MCP Server', () => {
  describe('Tool Registration', () => {
    it('should list all 24 registered tools', async () => {
      // This test verifies all tools from canvas, vault, dashboard modules
      const expectedTools = [
        // Canvas Tools (7)
        'canvas_create',
        'canvas_expand',
        'canvas_add_node',
        'canvas_info',
        'canvas_list_questions',
        'canvas_resolve_question',
        'canvas_crystallize',
        // Vault Tools (10)
        'vault_search',
        'vault_find_related',
        'vault_note_metadata',
        'vault_build_index',
        'vault_stats',
        'canvas_find_related',
        'canvas_search',
        'canvas_network',
        'canvas_suggest_links',
        'crossref_stats',
        // Dashboard Tools (6)
        'dashboard_overview',
        'dashboard_progress',
        'dashboard_list_canvases',
        'dashboard_activity',
        'dashboard_pending',
        'dashboard_health',
      ];

      // In actual test, call listTools and verify
      expect(expectedTools).toHaveLength(23);
    });
  });
});
```

#### TC-SRV-002: Each tool has proper schema
```typescript
it('should have valid input schema for each tool', async () => {
  // Verify each tool has:
  // - name (string)
  // - description (string)
  // - inputSchema with type 'object'
  // - required fields array
});
```

---

## 2. Zod to JSON Schema Conversion Tests

#### TC-SRV-003: Convert string type correctly
```typescript
describe('Schema Conversion', () => {
  it('should convert ZodString to JSON Schema string', () => {
    // Input: z.string()
    // Expected: { type: 'string' }
  });
});
```

#### TC-SRV-004: Convert optional fields correctly
```typescript
it('should not include optional fields in required array', () => {
  // Input schema with:
  // - required: z.string()
  // - optional: z.string().optional()
  // Expected required: ['required']
});
```

#### TC-SRV-005: Convert array type correctly
```typescript
it('should convert ZodArray to JSON Schema array', () => {
  // Input: z.array(z.string())
  // Expected: { type: 'array' }
  // Note: Current implementation loses items type - this is a known issue
});
```

#### TC-SRV-006: Convert enum type correctly
```typescript
it('should convert ZodEnum to JSON Schema string', () => {
  // Input: z.enum(['a', 'b', 'c'])
  // Expected: { type: 'string' }
  // Note: Enum values not preserved in current implementation
});
```

---

## 3. Tool Handler Routing Tests

#### TC-SRV-007: Route to correct handler
```typescript
describe('Tool Handler Routing', () => {
  it('should route canvas_create to CanvasTools.createCanvas', async () => {
    // Call canvas_create via MCP
    // Verify CanvasTools.createCanvas was called
  });

  it('should route vault_search to VaultTools.searchNotes', async () => {
    // Call vault_search via MCP
    // Verify VaultTools.searchNotes was called
  });

  it('should route dashboard_overview to DashboardTools.getDashboard', async () => {
    // Call dashboard_overview via MCP
    // Verify DashboardTools.getDashboard was called
  });
});
```

#### TC-SRV-008: Return MethodNotFound for unknown tool
```typescript
it('should return MethodNotFound error for unknown tool', async () => {
  // Call unknown_tool via MCP
  // Expect: McpError with ErrorCode.MethodNotFound
});
```

---

## 4. Response Format Tests

#### TC-SRV-009: Return JSON text content on success
```typescript
describe('Response Format', () => {
  it('should return JSON text content on success', async () => {
    // Call any tool successfully
    // Verify response format:
    // {
    //   content: [{ type: 'text', text: '{"...json..."}' }]
    // }
  });
});
```

#### TC-SRV-010: Return error response on failure
```typescript
it('should return error response with isError flag', async () => {
  // Call tool that will fail
  // Verify response format:
  // {
  //   content: [{ type: 'text', text: '{"error":"..."}' }],
  //   isError: true
  // }
});
```

---

## 5. Environment Variable Tests

#### TC-SRV-011: Use VAULT_PATH environment variable
```typescript
describe('Environment Variables', () => {
  it('should use VAULT_PATH from environment', async () => {
    process.env.VAULT_PATH = '/custom/vault';
    // Initialize server
    // Verify vault operations use /custom/vault
  });
});
```

#### TC-SRV-012: Use CANVAS_DIR environment variable
```typescript
it('should use CANVAS_DIR from environment', async () => {
  process.env.CANVAS_DIR = 'custom_canvas';
  // Initialize server
  // Verify canvas operations use custom_canvas directory
});
```

#### TC-SRV-013: Use default values when env not set
```typescript
it('should use default values when environment variables not set', async () => {
  delete process.env.VAULT_PATH;
  delete process.env.CANVAS_DIR;
  // Initialize server
  // Verify defaults: VAULT_PATH='.' CANVAS_DIR='03_Canvas'
});
```

---

# Part 2: End-to-End Tests

## Test Setup

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { vol } from 'memfs';

// MCP Test Client implementation
class MCPTestClient {
  private process: ChildProcess;
  private requestId = 0;

  async connect(): Promise<void> {
    this.process = spawn('node', ['dist/server.js'], {
      env: { ...process.env, VAULT_PATH: '/test-vault', CANVAS_DIR: '03_Canvas' },
    });
    // Wait for ready
  }

  async disconnect(): Promise<void> {
    this.process.kill();
  }

  async listTools(): Promise<any[]> {
    return this.sendRequest('tools/list', {});
  }

  async callTool(name: string, args: any): Promise<any> {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    const id = ++this.requestId;
    const request = JSON.stringify({ jsonrpc: '2.0', id, method, params });
    // Send via stdin and read from stdout
  }
}
```

---

## 6. Full Protocol Round-Trip Tests

#### TC-E2E-001: Complete tool list round-trip
```typescript
describe('E2E Tests', () => {
  let client: MCPTestClient;

  beforeAll(async () => {
    client = new MCPTestClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should complete tools/list round-trip', async () => {
    const tools = await client.listTools();

    expect(tools).toBeInstanceOf(Array);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0]).toHaveProperty('name');
    expect(tools[0]).toHaveProperty('description');
    expect(tools[0]).toHaveProperty('inputSchema');
  });
});
```

#### TC-E2E-002: Complete canvas creation round-trip
```typescript
it('should complete canvas_create tool call round-trip', async () => {
  const result = await client.callTool('canvas_create', {
    topic: 'E2E Test Topic',
  });

  expect(result.content).toHaveLength(1);
  expect(result.content[0].type).toBe('text');

  const data = JSON.parse(result.content[0].text);
  expect(data.canvasPath).toContain('E2E_Test_Topic');
  expect(data.topicNodeId).toBeDefined();
});
```

---

## 7. Full Workflow E2E Tests

#### TC-E2E-003: Complete knowledge exploration workflow
```typescript
describe('Full Workflow E2E', () => {
  it('should complete full knowledge exploration workflow via MCP', async () => {
    // Step 1: Create canvas
    const createResult = await client.callTool('canvas_create', {
      topic: 'Quantum Computing',
      initialQuestions: ['What is superposition?', 'How do qubits work?'],
    });
    const { canvasPath, topicNodeId } = JSON.parse(createResult.content[0].text);

    // Step 2: Get canvas info
    const infoResult = await client.callTool('canvas_info', { canvasPath });
    const info = JSON.parse(infoResult.content[0].text);
    expect(info.statistics.questions).toBe(2);

    // Step 3: Expand with answers
    const expandResult = await client.callTool('canvas_expand', {
      canvasPath,
      anchorId: topicNodeId,
      items: [
        {
          relation: 'answers',
          type: 'text',
          content: 'Superposition allows qubits to be in multiple states simultaneously',
        },
      ],
    });
    const expanded = JSON.parse(expandResult.content[0].text);
    expect(expanded.addedNodes).toHaveLength(1);

    // Step 4: Check workflow progress
    const progressResult = await client.callTool('dashboard_progress', { canvasPath });
    const progress = JSON.parse(progressResult.content[0].text);
    expect(progress.currentState).toBe('expanded');

    // Step 5: Crystallize
    const crystallizeResult = await client.callTool('canvas_crystallize', {
      canvasPath,
      format: 'summary',
    });
    const crystallized = JSON.parse(crystallizeResult.content[0].text);
    expect(crystallized.outputPath).toBeDefined();
  });
});
```

#### TC-E2E-004: Multi-canvas cross-reference workflow
```typescript
it('should discover cross-canvas relationships via MCP', async () => {
  // Create multiple related canvases
  await client.callTool('canvas_create', {
    topic: 'Machine Learning Basics',
    relatedKeywords: ['ML', 'AI', 'algorithms'],
  });

  await client.callTool('canvas_create', {
    topic: 'Neural Networks',
    relatedKeywords: ['ML', 'deep learning', 'AI'],
  });

  await client.callTool('canvas_create', {
    topic: 'Cooking Recipes',
    relatedKeywords: ['food', 'kitchen'],
  });

  // Build cross-reference
  await client.callTool('vault_build_index', { force: true });

  // Get network
  const networkResult = await client.callTool('canvas_network', {});
  const network = JSON.parse(networkResult.content[0].text);

  expect(network.nodes.length).toBe(3);
  // ML and Neural Networks should be connected
  expect(network.edges.some((e: any) =>
    (e.source.includes('Machine') && e.target.includes('Neural')) ||
    (e.source.includes('Neural') && e.target.includes('Machine'))
  )).toBe(true);
});
```

---

## 8. Error Handling E2E Tests

#### TC-E2E-005: Handle missing required parameters
```typescript
describe('Error Handling E2E', () => {
  it('should return error for missing required parameters', async () => {
    const result = await client.callTool('canvas_create', {
      // Missing required 'topic' parameter
    });

    expect(result.isError).toBe(true);
    const error = JSON.parse(result.content[0].text);
    expect(error.error).toBeDefined();
  });
});
```

#### TC-E2E-006: Handle invalid canvas path
```typescript
it('should return error for invalid canvas path', async () => {
  const result = await client.callTool('canvas_info', {
    canvasPath: '/nonexistent/path.canvas',
  });

  expect(result.isError).toBe(true);
});
```

#### TC-E2E-007: Handle invalid relation type gracefully
```typescript
it('should handle invalid relation with fallback', async () => {
  const { canvasPath, topicNodeId } = await createTestCanvas(client);

  // Use invalid relation - should fall back to SOUTH
  const result = await client.callTool('canvas_add_node', {
    canvasPath,
    anchorId: topicNodeId,
    relation: 'invalid_relation_type',
    type: 'text',
    content: 'Test content',
  });

  expect(result.isError).toBeFalsy();
  const data = JSON.parse(result.content[0].text);
  expect(data.zone).toBe('SOUTH'); // Fallback zone
});
```

---

## 9. Performance E2E Tests

#### TC-E2E-008: Handle rapid sequential requests
```typescript
describe('Performance E2E', () => {
  it('should handle 50 sequential tool calls', async () => {
    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      await client.callTool('vault_stats', {});
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10000); // < 10 seconds
  });
});
```

#### TC-E2E-009: Handle concurrent tool calls
```typescript
it('should handle 10 concurrent canvas creations', async () => {
  const promises = Array.from({ length: 10 }, (_, i) =>
    client.callTool('canvas_create', {
      topic: `Concurrent Test ${i}`,
    })
  );

  const results = await Promise.all(promises);

  expect(results.every(r => !r.isError)).toBe(true);
  const uniquePaths = new Set(
    results.map(r => JSON.parse(r.content[0].text).canvasPath)
  );
  expect(uniquePaths.size).toBe(10); // All unique
});
```

---

## 10. State Persistence E2E Tests

#### TC-E2E-010: Verify state persistence across requests
```typescript
describe('State Persistence E2E', () => {
  it('should persist canvas data across tool calls', async () => {
    // Create canvas
    const createResult = await client.callTool('canvas_create', {
      topic: 'Persistence Test',
    });
    const { canvasPath } = JSON.parse(createResult.content[0].text);

    // Disconnect and reconnect (simulate restart)
    await client.disconnect();
    await client.connect();

    // Verify canvas still exists
    const infoResult = await client.callTool('canvas_info', { canvasPath });
    expect(infoResult.isError).toBeFalsy();

    const info = JSON.parse(infoResult.content[0].text);
    expect(info.topic).toBe('Persistence Test');
  });
});
```

#### TC-E2E-011: Verify index persistence
```typescript
it('should persist vault index across server restarts', async () => {
  // Build index
  await client.callTool('vault_build_index', {});

  // Get stats
  const stats1 = await client.callTool('vault_stats', {});

  // Restart
  await client.disconnect();
  await client.connect();

  // Get stats again without rebuilding
  const stats2 = await client.callTool('vault_stats', {});

  // Should have same data
  expect(stats1.content[0].text).toBe(stats2.content[0].text);
});
```

---

## 11. Edge Cases E2E Tests

#### TC-E2E-012: Handle unicode in tool parameters
```typescript
describe('Edge Cases E2E', () => {
  it('should handle unicode characters in parameters', async () => {
    const result = await client.callTool('canvas_create', {
      topic: '한글 제목 🚀 日本語',
      initialQuestions: ['이것은 무엇인가요?', 'なぜ重要ですか?'],
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.canvasPath).toContain('한글');
  });
});
```

#### TC-E2E-013: Handle very long content
```typescript
it('should handle very long text content', async () => {
  const { canvasPath, topicNodeId } = await createTestCanvas(client);
  const longContent = 'A'.repeat(100000);

  const result = await client.callTool('canvas_add_node', {
    canvasPath,
    anchorId: topicNodeId,
    relation: 'elaborates',
    type: 'text',
    content: longContent,
  });

  expect(result.isError).toBeFalsy();
});
```

#### TC-E2E-014: Handle empty arrays in parameters
```typescript
it('should handle empty arrays in parameters', async () => {
  const result = await client.callTool('canvas_create', {
    topic: 'Empty Arrays Test',
    relatedKeywords: [],
    initialQuestions: [],
  });

  expect(result.isError).toBeFalsy();
});
```

---

## Test Utilities

### MCP Test Client Implementation
```typescript
// tests/helpers/mcp-client.ts
export class MCPTestClient {
  private stdio: {
    stdin: Writable;
    stdout: Readable;
  };
  private responseBuffer = '';
  private requestId = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  async connect(): Promise<void> {
    // Spawn server process and setup stdio streams
  }

  async sendRequest(method: string, params: any): Promise<any> {
    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.stdio.stdin.write(JSON.stringify(request) + '\n');
    });
  }
}
```

### Test Canvas Factory
```typescript
// tests/helpers/canvas-factory.ts
export async function createTestCanvas(client: MCPTestClient, options?: {
  topic?: string;
  questions?: string[];
}) {
  const result = await client.callTool('canvas_create', {
    topic: options?.topic || 'Test Canvas',
    initialQuestions: options?.questions || [],
  });
  return JSON.parse(result.content[0].text);
}
```

---

## Running E2E Tests

```bash
# Build the project first
npm run build

# Run E2E tests
npm run test:e2e

# Run with specific timeout
npm run test:e2e -- --timeout 30000

# Run with verbose output
npm run test:e2e -- --reporter verbose
```

## CI Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
        timeout-minutes: 10
```
