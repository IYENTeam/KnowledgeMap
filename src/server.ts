#!/usr/bin/env node
/**
 * Canvas Knowledge MCP Server v2.0
 *
 * Obsidian Canvas 기반 지식 관리 워크플로우를 위한 MCP 서버
 *
 * 주요 개선사항:
 * - 환경 검증 및 자동 복구
 * - 타입 안전한 Tool Registry
 * - 구조화된 에러 시스템
 * - 정확한 JSON Schema 변환
 * - 구조화된 로깅
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import {
  logger,
  configManager,
  initializeEnvironment,
  toolRegistry,
  isKnowledgeOSError,
} from './core/index.js';

import {
  CanvasTools,
  canvasToolDefinitions,
  VaultTools,
  vaultToolDefinitions,
  DashboardTools,
  dashboardToolDefinitions,
} from './tools/index.js';

// =============================================================================
// Server Setup
// =============================================================================

async function createServer(): Promise<Server> {
  // 1. 환경 초기화 및 검증
  await initializeEnvironment();

  const config = configManager.getConfig();

  // 2. Tool 인스턴스 생성
  const canvasTools = new CanvasTools(config.canvasDir, config.vaultPath);
  const vaultTools = new VaultTools(config.vaultPath, config.canvasDir);
  const dashboardTools = new DashboardTools(config.canvasDir, config.vaultPath);

  // 3. Tool Registry에 도구 등록
  registerCanvasTools(canvasTools);
  registerVaultTools(vaultTools);
  registerDashboardTools(dashboardTools);

  logger.info('Tools registered', { count: toolRegistry.size });

  // 4. MCP Server 생성
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 5. Request Handlers 등록
  setupRequestHandlers(server);

  return server;
}

// =============================================================================
// Tool Registration
// =============================================================================

function registerCanvasTools(tools: CanvasTools): void {
  for (const def of canvasToolDefinitions) {
    toolRegistry.register({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
      handler: getCanvasToolHandler(def.name, tools),
    });
  }
}

function getCanvasToolHandler(
  name: string,
  tools: CanvasTools
): (params: any) => Promise<unknown> {
  const handlers: Record<string, (params: any) => Promise<unknown>> = {
    canvas_create: (params) => tools.createCanvas(params),
    canvas_expand: (params) => tools.expandCanvas(params),
    canvas_add_node: (params) => tools.addNode(params),
    canvas_info: (params) => tools.getCanvasInfo(params),
    canvas_list_questions: (params) => tools.listQuestions(params),
    canvas_resolve_question: (params) => tools.resolveQuestion(params),
    canvas_crystallize: (params) => tools.crystallizeCanvas(params),
  };

  return handlers[name] ?? (() => Promise.reject(new Error(`Unknown canvas tool: ${name}`)));
}

function registerVaultTools(tools: VaultTools): void {
  for (const def of vaultToolDefinitions) {
    toolRegistry.register({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
      handler: getVaultToolHandler(def.name, tools),
    });
  }
}

function getVaultToolHandler(
  name: string,
  tools: VaultTools
): (params: any) => Promise<unknown> {
  const handlers: Record<string, (params: any) => Promise<unknown>> = {
    vault_search: (params) => tools.searchNotes(params),
    vault_find_related: (params) => tools.findRelatedNotes(params),
    vault_note_metadata: (params) => tools.getNoteMetadata(params),
    vault_build_index: (params) => tools.buildIndex(params),
    vault_stats: (params) => tools.getVaultStats(params),
    canvas_find_related: (params) => tools.findRelatedCanvases(params),
    canvas_search: (params) => tools.searchCanvases(params),
    canvas_network: (params) => tools.getCanvasNetwork(params),
    canvas_suggest_links: (params) => tools.suggestLinks(params),
    crossref_stats: (params) => tools.getCrossRefStats(params),
  };

  return handlers[name] ?? (() => Promise.reject(new Error(`Unknown vault tool: ${name}`)));
}

function registerDashboardTools(tools: DashboardTools): void {
  for (const def of dashboardToolDefinitions) {
    toolRegistry.register({
      name: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
      handler: getDashboardToolHandler(def.name, tools),
    });
  }
}

function getDashboardToolHandler(
  name: string,
  tools: DashboardTools
): (params: any) => Promise<unknown> {
  const handlers: Record<string, (params: any) => Promise<unknown>> = {
    dashboard_overview: (params) => tools.getDashboard(params),
    dashboard_progress: (params) => tools.getWorkflowProgress(params),
    dashboard_list_canvases: (params) => tools.listCanvases(params),
    dashboard_activity: (params) => tools.getActivityLog(params),
    dashboard_pending: (params) => tools.getPendingTasks(params),
    dashboard_health: (params) => tools.getSystemHealth(params),
  };

  return handlers[name] ?? (() => Promise.reject(new Error(`Unknown dashboard tool: ${name}`)));
}

// =============================================================================
// Request Handlers
// =============================================================================

function setupRequestHandlers(server: Server): void {
  /**
   * List Tools Handler
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = toolRegistry.getMCPToolDefinitions();

    logger.debug('Tools listed', { count: tools.length });

    return { tools };
  });

  /**
   * Call Tool Handler
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // 도구 존재 확인
    if (!toolRegistry.has(name)) {
      logger.warn('Unknown tool requested', { tool: name });
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    // 도구 실행
    const result = await toolRegistry.execute(name, args || {});

    // 결과 반환
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    } else {
      // 에러 응답 (구조화된 에러 정보 포함)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: result.error?.message,
                code: result.error?.code,
                context: result.error?.context,
                recoveryHints: result.error?.recoveryHints,
                duration: result.duration,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });
}

// =============================================================================
// Server Startup
// =============================================================================

async function main(): Promise<void> {
  try {
    logger.info('Starting Canvas Knowledge MCP Server...');

    const server = await createServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    const config = configManager.getConfig();
    logger.info(`${config.name} v${config.version} running on stdio`, {
      vaultPath: config.vaultPath,
      canvasDir: config.canvasDir,
      tools: toolRegistry.size,
    });
  } catch (error) {
    if (isKnowledgeOSError(error)) {
      logger.fatal('Server startup failed', error, {
        code: error.code,
        context: error.context,
      });
    } else {
      logger.fatal('Server startup failed', error);
    }
    process.exit(1);
  }
}

// =============================================================================
// Entry Point
// =============================================================================

main();
