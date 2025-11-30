# CLAUDE.md - Canvas Knowledge System

> AI 에이전트가 이 코드베이스를 이해하고 효과적으로 작업하기 위한 가이드

---

## 1. Project Overview

**Canvas Knowledge System**은 Obsidian Canvas 기반의 AI 지식 관리 워크플로우를 위한 시스템입니다.

```
Project: canvas-knowledge-mcp v2.1.0
Architecture: Dual-Layer (MCP Server + Python CLI)
Languages: TypeScript (ES2022) + Python 3.10+
Runtime: Node.js 18+ / Python 3.10+
Protocol: MCP (stdio transport)
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Canvas Knowledge System                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │   MCP Server (TS)    │    │    Python CLI (Claude Code)  │  │
│  │   - 23 MCP Tools     │    │    - canvas_cli.py           │  │
│  │   - Claude Desktop   │    │    - canvas_layout.py v2.1   │  │
│  │   - Standard I/O     │    │    - canvas_config.py        │  │
│  └──────────────────────┘    └──────────────────────────────┘  │
│              │                           │                       │
│              └───────────┬───────────────┘                       │
│                          ▼                                       │
│              ┌──────────────────────┐                           │
│              │   Obsidian Canvas    │                           │
│              │   (.canvas files)    │                           │
│              └──────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Core Innovation: Semantic Layout Protocol

AI 에이전트는 **좌표가 아닌 의미적 관계만 지정**하고, 시스템이 자동으로 레이아웃을 처리합니다.

```typescript
// Agent가 지정하는 것: 의미적 관계만
{ relation: "answers", anchorId: "node_123", content: { type: "text", text: "답변 내용" } }

// System이 자동으로 처리: Zone 매핑 → 좌표 계산 → 노드 배치
// "answers" → SOUTH Zone → (x: 0, y: 300) → 노드 생성
```

---

## 2. Architecture

### 2.1 Directory Structure

```
knowledgeOS/
├── src/                           # MCP Server (TypeScript)
│   ├── server.ts                  # MCP 서버 진입점 (23개 도구 등록)
│   ├── engine/                    # 핵심 처리 엔진
│   │   ├── canvas-parser.ts       # Canvas 파일 I/O
│   │   ├── semantic-router.ts     # Relation → Zone 매핑
│   │   ├── layout-engine.ts       # Zone 기반 자동 배치
│   │   ├── meta-manager.ts        # Sidecar 메타데이터 관리
│   │   ├── vault-indexer.ts       # Obsidian 볼트 인덱싱
│   │   └── cross-reference.ts     # 캔버스 간 관계 분석
│   ├── tools/                     # MCP 도구 구현
│   │   ├── canvas-tools.ts        # 캔버스 CRUD (7개 도구)
│   │   ├── vault-tools.ts         # 볼트 검색 (10개 도구)
│   │   └── dashboard-tools.ts     # 워크플로우 모니터링 (6개 도구)
│   └── types/                     # 타입 정의
│       ├── canvas.ts              # JSON Canvas 스펙 타입
│       ├── semantic.ts            # Semantic Relations & Zones
│       ├── meta.ts                # 워크플로우 메타데이터
│       └── vault.ts               # 볼트 인덱싱 타입
│
├── .claude/lib/                   # Python CLI (Claude Code)
│   ├── canvas_cli.py              # CLI 진입점 v2.0
│   ├── canvas_layout.py           # Layout Engine v2.1 (동적 크기)
│   ├── canvas_config.py           # 설정 및 동적 크기 계산 v2.1
│   ├── canvas_parser.py           # Canvas 파일 I/O
│   ├── canvas_meta.py             # 메타데이터 관리
│   ├── semantic_router.py         # Relation → Zone 매핑
│   ├── intent_processor.py        # Intent Node 처리
│   ├── vault_index.py             # 볼트 인덱싱
│   └── cross_reference.py         # 캔버스 간 관계
│
├── dist/                          # 컴파일된 JavaScript
├── docs/test-specs/               # 테스트 스펙 문서
├── package.json
└── tsconfig.json
```

### 2.2 Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ MCP Client  │────▶│   server.ts      │────▶│   Tool Classes   │
│ (Claude)    │◀────│ (Tool Registry)  │◀────│                  │
└─────────────┘     └──────────────────┘     └──────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
           ┌────────────────┐               ┌────────────────┐               ┌────────────────┐
           │ CanvasParser   │               │ LayoutEngine   │               │ MetaManager    │
           │ (.canvas I/O)  │               │ (Zone 배치)    │               │ (.meta.json)   │
           └────────────────┘               └────────────────┘               └────────────────┘
                    │                                 │
                    │                                 ▼
                    │                        ┌────────────────┐
                    │                        │ SemanticRouter │
                    │                        │ (Relation→Zone)│
                    │                        └────────────────┘
                    ▼
           ┌────────────────┐
           │ .canvas files  │ ◀── JSON Canvas Spec v1.0
           └────────────────┘
```

---

## 3. Zone System (Semantic Layout Protocol)

### 3.1 Zone Diagram

```
              ┌─────────────────┬─────────────────┬─────────────────┐
              │   NORTH_WEST    │      NORTH      │   NORTH_EAST    │
              │   선행 지식     │    상위 개념     │      확장       │
              │   (orange)      │    (purple)     │    (green)      │
              ├─────────────────┼─────────────────┼─────────────────┤
              │      WEST       │      CORE       │      EAST       │
              │   배경 지식     │      주제       │   후속 탐구     │
              │   (orange)      │    (purple)     │    (green)      │
              ├─────────────────┼─────────────────┼─────────────────┤
              │   SOUTH_WEST    │      SOUTH      │   SOUTH_EAST    │
              │   대안/반례     │    답변/결론    │   예시/상세     │
              │   (red)         │    (yellow)     │    (cyan)       │
              └─────────────────┴─────────────────┴─────────────────┘
```

### 3.2 Relation → Zone Mapping

| Semantic Relation | Zone | 용도 | 색상 |
|-------------------|------|------|------|
| `answers`, `solution` | SOUTH | 답변/결론 | 3 (yellow) |
| `elaborates`, `detail`, `example`, `instance` | SOUTH_EAST | 예시/상세 | 5 (cyan) |
| `background`, `context` | WEST | 배경 지식 | 2 (orange) |
| `precedes`, `prerequisite` | NORTH_WEST | 선행 지식 | 2 (orange) |
| `follows`, `implication`, `followUp` | EAST | 후속 탐구 | 4 (green) |
| `contradicts`, `alternative`, `counter` | SOUTH_WEST | 대안/반례 | 1 (red) |
| `parent`, `generalization` | NORTH | 상위 개념 | 6 (purple) |
| `resource`, `reference` | EAST | 리소스 | 4 (green) |

### 3.3 Relation Aliases

```typescript
// 사용 가능한 별칭 (src/types/semantic.ts:230-250)
answer → answers      solve → solution       explain → elaborates
details → detail      examples → example     bg → background
ctx → context         before → precedes      prereq → prerequisite
after → follows       next → followUp        followup → followUp
oppose → contradicts  alt → alternative      vs → contradicts
super → parent        general → generalization
ref → reference       link → resource
```

---

## 4. Workflow State Machine

캔버스는 다음 상태를 거쳐 진화합니다:

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐
│ created  │───▶│ expanded │───▶│ crystallized │───▶│ atomized │───▶│ archived │
└──────────┘    └──────────┘    └──────────────┘    └──────────┘    └──────────┘
     │               │                │                  │               │
     ▼               ▼                ▼                  ▼               ▼
  초기 생성      노드 추가       노트로 변환        원자 노트      보관 완료
```

| 상태 | 설명 | 전환 조건 |
|------|------|-----------|
| `created` | 캔버스 초기 생성 | canvas_create 호출 |
| `expanded` | 탐구 진행 중 | canvas_expand/add_node 호출 |
| `crystallized` | 노트로 결정화됨 | canvas_crystallize 호출 |
| `atomized` | 원자 노트로 분해됨 | 추후 구현 |
| `archived` | 작업 완료/보관 | 수동 설정 |

---

## 5. Node Color Coding System

```typescript
// src/types/semantic.ts - ZONE_SPECS
const NODE_COLORS = {
  '1': 'Red',     // 명령/의도, 대안/반론
  '2': 'Orange',  // 배경/맥락, 선행 지식
  '3': 'Yellow',  // 답변/결론
  '4': 'Green',   // 질문, 후속 탐구
  '5': 'Cyan',    // 리소스, 예시/상세
  '6': 'Purple',  // 주제, 상위 개념
};
```

---

## 6. Dynamic Node Sizing (v2.1)

v2.1에서 텍스트 길이에 따라 노드 크기가 자동으로 계산됩니다.

### 6.1 크기 계산 원리

```python
# .claude/lib/canvas_config.py - calculate_text_node_size()

SIZE_CALC_CONFIG = {
    "char_width": 8,           # 평균 글자 너비 (px)
    "line_height": 24,         # 줄 높이 (px)
    "padding_x": 32,           # 좌우 패딩 (px)
    "padding_y": 24,           # 상하 패딩 (px)
    "min_width": 280,          # 최소 너비
    "min_height": 80,          # 최소 높이
    "max_width": 600,          # 최대 너비
    "max_height": 500,         # 최대 높이
}
```

### 6.2 마크다운 요소 인식

| 요소 | 처리 | 추가 높이 |
|------|------|-----------|
| `# H1` | 헤더 레벨 1 | +20px |
| `## H2` | 헤더 레벨 2 | +16px |
| `### H3` | 헤더 레벨 3 | +12px |
| ``` ` ` ` ``` | 코드블록 | +24px (시작/끝) |
| `- item` | 리스트 아이템 | 28px/줄 |
| 빈 줄 | 여백 | 12px (line_height/2) |

### 6.3 노드 타입별 크기

```python
# 텍스트 노드: 동적 계산
{"w": 계산된_너비, "h": 계산된_높이}

# 파일 노드: 고정 크기
{"w": 380, "h": 100}

# 링크 노드: 고정 크기
{"w": 400, "h": 80}
```

### 6.4 크기 계산 예시

```python
# 짧은 텍스트 → 최소 크기
"? 질문" → {"w": 280, "h": 80}

# 긴 텍스트 → 너비/높이 확장
"## 긴 헤더\n- 항목1\n- 항목2\n- 항목3" → {"w": 400, "h": 180}

# 코드블록 포함 → 추가 패딩
"```python\ncode\n```" → {"w": 289, "h": 208}
```

---

## 7. Edge Policy (v2.1)

v2.1에서 엣지 생성 정책이 변경되어 **Zone 배치만으로 관계를 표현**합니다.

### 7.1 엣지 생성 정책

```python
# .claude/lib/canvas_config.py - EDGE_POLICY

EDGE_POLICY = {
    # 엣지를 생성할 relation (핵심 연결만)
    "create_edge_for": [
        "answers",      # 질문 → 답변
        "resolves",     # 질문 해결
    ],

    # 엣지 생성 안 함 (Zone 배치만)
    "no_edge_for": [
        "background",    # 배경 지식
        "prerequisite",  # 선행 지식
        "follows_up",    # 후속 질문
        "elaborates",    # 상세 설명
        "contrasts",     # 대안/반론
        "generalizes",   # 상위 개념
        "resource",      # 리소스
    ],
}
```

### 7.2 변경 전후 비교

```
[변경 전] 모든 노드에 엣지 연결 → 스파게티 연결

         [Topic]
        /  |  \  \
       /   |   \  \
    [Q1] [Q2] [Q3] [File1]


[변경 후] Zone 기반 공간 구획 → 깔끔한 레이아웃

    [WEST Zone]     [Topic]     [EAST Zone]
                       ↓
                 [SOUTH Zone]
                 (답변만 엣지)
```

### 7.3 엣지 생성 판단 함수

```python
from canvas_config import should_create_edge

should_create_edge("answers")     # True  → 엣지 생성
should_create_edge("background")  # False → Zone 배치만
should_create_edge("elaborates")  # False → Zone 배치만
```

---

## 8. Development Commands

### 8.1 MCP Server (TypeScript)

```bash
# 의존성 설치
npm install

# 개발 모드 (watch)
npm run dev

# TypeScript 컴파일
npm run build

# 프로덕션 실행
npm start

# MCP Inspector로 디버깅
npm run inspect

# 코드 품질 검사
npm lint

# 테스트 실행
npm test
```

### 8.2 Python CLI (Claude Code)

```bash
# CLI 실행 (from vault root)
PYTHONPATH=/path/to/.claude python3 -c "
from lib.canvas_cli import CanvasCLI
cli = CanvasCLI('03_Canvas')
result = cli.init_canvas(topic='My Topic', questions=['Q1', 'Q2'])
print(result)
"

# 노드 배치
python3 -c "
from lib.canvas_cli import CanvasCLI
cli = CanvasCLI('03_Canvas')
result = cli.allocate(
    canvas_path='03_Canvas/MyTopic.canvas',
    anchor_id='text-abc123',
    relation='answers',
    content={'type': 'text', 'text': '답변 내용'}
)
print(result)
"

# Intent 처리 (dry-run)
python3 -m lib.canvas_cli process --canvas 03_Canvas/MyTopic.canvas --dry-run
```

---

## 9. Environment Configuration

```bash
# 환경 변수 (src/server.ts:40-41)
VAULT_PATH=.           # Obsidian 볼트 경로 (기본: 현재 디렉토리)
CANVAS_DIR=03_Canvas   # 캔버스 저장 디렉토리
```

### Claude Desktop 설정 예시

```json
{
  "mcpServers": {
    "canvas-knowledge": {
      "command": "node",
      "args": ["/path/to/knowledgeOS/dist/server.js"],
      "env": {
        "VAULT_PATH": "/path/to/obsidian/vault",
        "CANVAS_DIR": "03_Canvas"
      }
    }
  }
}
```

---

## 10. Code Conventions

### 10.1 ID Generation

```typescript
// src/engine/canvas-parser.ts
// 형식: {prefix}-{uuid8}
CanvasParser.generateId('text');  // → "text-a1b2c3d4"
CanvasParser.generateId('file');  // → "file-e5f6g7h8"
CanvasParser.generateId();        // → "a1b2c3d4"
```

### 10.2 File Paths

- 모든 경로는 **상대 경로** 사용 (VAULT_PATH, CANVAS_DIR 기준)
- Canvas 경로: `{CANVAS_DIR}/{filename}.canvas`
- Meta 경로: `{CANVAS_DIR}/.meta/{filename}.meta.json`

### 10.3 TypeScript Conventions

- **Strict Mode** 활성화 (암시적 any 불허)
- 미사용 변수/매개변수 에러 처리
- Zod 스키마로 런타임 타입 검증
- 비동기는 `fs/promises` API 사용

### 10.4 Tool Definition Pattern

```typescript
// 1. Zod 스키마 정의
export const MyToolSchema = z.object({
  param1: z.string().describe('파라미터 설명'),
  param2: z.number().optional().describe('선택적 파라미터'),
});

// 2. 클래스 메서드 구현
async myTool(params: z.infer<typeof MyToolSchema>): Promise<ResultType> {
  // 구현
}

// 3. 도구 정의 배열에 추가
export const toolDefinitions = [
  { name: 'my_tool', description: '도구 설명', inputSchema: MyToolSchema },
];
```

---

## 11. Key Modification Points

### 11.1 새로운 Semantic Relation 추가

**파일**: `src/types/semantic.ts`

```typescript
// 1. SemanticRelation 타입에 추가 (line 12-39)
export type SemanticRelation =
  | 'answers'
  // ... 기존 관계들 ...
  | 'newRelation';  // 새 관계 추가

// 2. RELATION_TO_ZONE 매핑 추가 (line 75-111)
export const RELATION_TO_ZONE: Record<SemanticRelation, Zone> = {
  // ... 기존 매핑 ...
  newRelation: 'SOUTH_EAST',  // 배치할 Zone 지정
};

// 3. (선택) RELATION_ALIASES에 별칭 추가 (line 230-250)
export const RELATION_ALIASES: Record<string, SemanticRelation> = {
  // ... 기존 별칭 ...
  newRel: 'newRelation',
};
```

### 11.2 새로운 MCP Tool 추가

**Step 1**: `src/tools/`에 스키마와 구현 추가

```typescript
// src/tools/canvas-tools.ts (또는 새 파일)

// 스키마 정의
export const NewToolSchema = z.object({
  canvasPath: z.string().describe('캔버스 경로'),
  // 추가 파라미터...
});

// 클래스에 메서드 추가
export class CanvasTools {
  async newTool(params: z.infer<typeof NewToolSchema>): Promise<ResultType> {
    // 구현
  }
}

// 도구 정의 배열에 추가
export const canvasToolDefinitions = [
  // ... 기존 도구들 ...
  {
    name: 'canvas_new_tool',
    description: '새 도구 설명',
    inputSchema: NewToolSchema,
  },
];
```

**Step 2**: `src/server.ts`에 핸들러 등록

```typescript
// src/server.ts (line 63-92)
const toolHandlers: Record<string, (params: unknown) => Promise<unknown>> = {
  // ... 기존 핸들러들 ...
  canvas_new_tool: (params) => canvasTools.newTool(params as any),
};
```

### 11.3 레이아웃 규칙 변경

**파일**: `src/engine/layout-engine.ts`

```typescript
// 레이아웃 설정 (line 24-30)
const LAYOUT_CONFIG = {
  gridGap: 40,           // 노드 간 간격
  collisionPadding: 20,  // 충돌 감지 여유 공간
  maxColumnNodes: 3,     // 세로 스택 최대 노드 수
  groupThreshold: 5,     // 그룹 생성 임계값
  groupPadding: 50,      // 그룹 내부 여백
};
```

### 11.4 Zone 크기/색상 변경

**파일**: `src/types/semantic.ts` - `ZONE_SPECS` (line 117-208)

```typescript
export const ZONE_SPECS: Record<Zone, ZoneSpec> = {
  SOUTH: {
    zone: 'SOUTH',
    dx: 0,
    dy: 1,
    edgeFrom: 'bottom',
    edgeTo: 'top',
    defaultColor: '3',  // 색상 변경
    label: '답변/결론',
    nodeSize: { width: 400, height: 200 },  // 크기 변경
  },
  // ...
};
```

---

## 12. Testing Guide

### 12.1 테스트 구조

```
src/__tests__/
├── fixtures/              # 테스트 데이터
│   ├── canvases/         # 테스트용 .canvas 파일
│   ├── vault/            # 테스트용 노트
│   └── meta/             # 테스트용 메타데이터
├── helpers/              # 테스트 유틸리티
├── unit/                 # 단위 테스트
├── integration/          # 통합 테스트
└── e2e/                  # E2E 테스트
```

### 12.2 테스트 작성 패턴

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('LayoutEngine', () => {
  describe('allocateByRelation', () => {
    it('should place node in SOUTH zone for "answers" relation', async () => {
      const engine = new LayoutEngine([topicNode], []);

      const result = engine.allocateByRelation({
        anchorId: topicNode.id,
        relation: 'answers',
        content: { type: 'text', text: '답변 내용' },
      });

      expect(result).not.toBeNull();
      expect(result!.node.y).toBeGreaterThan(topicNode.y);
    });
  });
});
```

### 12.3 Coverage 목표

| 영역 | 목표 | 현재 상태 |
|------|------|-----------|
| Engine (핵심 로직) | 90%+ | 스펙만 작성됨 |
| Tools (MCP 핸들러) | 80%+ | 스펙만 작성됨 |
| Types (검증) | 70%+ | 스펙만 작성됨 |
| Server (프로토콜) | 60%+ | 스펙만 작성됨 |

---

## 13. Troubleshooting

### 13.1 Canvas 생성 오류

#### `Anchor node not found: {id}`

**원인**: 지정한 anchorId에 해당하는 노드가 캔버스에 없음

**해결**:
```typescript
// 1. canvas_info로 노드 ID 확인
await canvasTools.getCanvasInfo({ canvasPath: 'path/to/canvas.canvas' });

// 2. 올바른 anchorId 사용
await canvasTools.addNode({
  canvasPath: 'path/to/canvas.canvas',
  anchorId: 'text-a1b2c3d4',  // 실제 존재하는 ID
  relation: 'answers',
  // ...
});
```

#### `Unknown relation: {relation}`

**원인**: 지원하지 않는 Semantic Relation 사용

**해결**:
```typescript
// 지원하는 관계 목록 확인: src/types/semantic.ts
// 또는 별칭 사용
'answer' → 'answers'
'explain' → 'elaborates'
'bg' → 'background'
```

#### `Failed to allocate node position`

**원인**: Zone에 더 이상 배치할 공간 없음 (충돌)

**해결**:
```python
# canvas_config.py에서 설정 조정
ZONE_PACKING_CONFIG = {
    "max_column_nodes": 5,  # 3 → 5로 증가
}
```
- 다른 Zone/Relation 사용
- 기존 노드 정리 후 재시도

#### Canvas 파일 파싱 오류

**원인**: JSON Canvas 스펙에 맞지 않는 파일

**해결**:
```json
// 올바른 Canvas 구조 확인
{
  "nodes": [
    { "id": "...", "type": "text", "x": 0, "y": 0, "width": 400, "height": 100, "text": "..." }
  ],
  "edges": [
    { "id": "...", "fromNode": "...", "toNode": "...", "fromSide": "bottom", "toSide": "top" }
  ]
}
```

### 13.2 Python CLI 오류

#### `ModuleNotFoundError: No module named 'lib'`

**원인**: PYTHONPATH 미설정 또는 잘못된 경로

**해결**:
```bash
# 올바른 PYTHONPATH 설정
PYTHONPATH=/path/to/vault/.claude python3 -c "from lib.canvas_cli import CanvasCLI"

# 또는 vault 루트에서 실행
cd /path/to/vault
PYTHONPATH=.claude python3 -c "from lib.canvas_cli import CanvasCLI"
```

#### `ImportError: attempted relative import with no known parent package`

**원인**: 직접 파일 실행 시 상대 임포트 실패

**해결**:
```bash
# 잘못된 방법
python3 .claude/lib/canvas_cli.py  # ❌

# 올바른 방법
PYTHONPATH=/path/to/.claude python3 -c "from lib.canvas_cli import CanvasCLI; ..."  # ✓
```

#### `json.JSONDecodeError` (--questions 인자)

**원인**: 잘못된 JSON 형식

**해결**:
```bash
# 올바른 JSON 형식
--questions '["질문1", "질문2", "질문3"]'

# 잘못된 예시
--questions "질문1, 질문2"  # ❌
--questions ['질문1']       # ❌ (작은따옴표)
```

#### `FileNotFoundError: 03_Canvas/`

**원인**: 캔버스 디렉토리 미존재

**해결**:
```bash
mkdir -p 03_Canvas
```

### 13.3 레이아웃 엔진 오류

#### Zone 충돌 (모든 위치 점유)

**원인**: 10번의 fallback 시도 모두 실패

**해결**:
```python
# canvas_layout.py의 _find_fallback_position()
# 현재 최대 10번 시도 (offset_multiplier range(1, 10))

# 해결책 1: 다른 Zone의 relation 사용
relation="elaborates"  # SOUTH_EAST로 배치

# 해결책 2: 기존 노드 정리
```

#### 노드 크기가 여전히 작음 (v2.1 이전 동작)

**원인**: 구버전 레이아웃 엔진 사용

**해결**:
```python
# ZoneLayoutEngine (v2.1) 사용 확인
from canvas_layout import ZoneLayoutEngine  # ✓
from canvas_layout import CanvasLayoutEngine  # ❌ (v1, 고정 크기)
```

### 13.4 MCP 연결 문제

#### Inspector에서 도구가 안 보임

```bash
# 1. 빌드 확인
npm run build

# 2. dist/server.js 존재 확인
ls -la dist/server.js

# 3. 수동 실행 테스트
node dist/server.js
# → "MCP server running on stdio" 출력 확인
```

#### Claude Desktop에서 연결 안 됨

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "canvas-knowledge": {
      "command": "node",
      "args": ["/absolute/path/to/dist/server.js"],  // 절대 경로!
      "env": {
        "VAULT_PATH": "/absolute/path/to/vault"      // 절대 경로!
      }
    }
  }
}
```

```bash
# Claude Desktop 재시작 필수
```

### 13.5 메타데이터 동기화 문제

#### `.meta.json` 파일 누락

```python
# Python CLI
cli.meta_manager.create("03_Canvas/MyCanvas.canvas")
```

```typescript
// MCP Server
await metaManager.create('path/to/canvas.canvas');
```

#### 워크플로우 상태 불일치

```python
# Python CLI
cli.add_workflow_action(
    canvas_path="03_Canvas/MyCanvas.canvas",
    action="expanded",
    agent="manual-fix",
    details={}
)
```

---

## 14. API Reference (23 Tools)

### Canvas Tools (7)

| Tool | Description |
|------|-------------|
| `canvas_create` | 새 캔버스 생성 |
| `canvas_expand` | 여러 노드 추가 |
| `canvas_add_node` | 단일 노드 추가 |
| `canvas_info` | 캔버스 정보 조회 |
| `canvas_list_questions` | 질문 노드 목록 |
| `canvas_resolve_question` | 질문 해결 표시 |
| `canvas_crystallize` | 노트로 결정화 |

### Vault Tools (10)

| Tool | Description |
|------|-------------|
| `vault_search` | 노트 검색 |
| `vault_find_related` | 관련 노트 찾기 |
| `vault_note_metadata` | 노트 메타데이터 |
| `vault_build_index` | 인덱스 빌드 |
| `vault_stats` | 볼트 통계 |
| `canvas_find_related` | 관련 캔버스 |
| `canvas_search` | 캔버스 검색 |
| `canvas_network` | 네트워크 그래프 |
| `canvas_suggest_links` | 링크 제안 |
| `crossref_stats` | 크로스레퍼런스 통계 |

### Dashboard Tools (6)

| Tool | Description |
|------|-------------|
| `dashboard_overview` | 전체 대시보드 |
| `dashboard_progress` | 워크플로우 진행 |
| `dashboard_list_canvases` | 캔버스 목록 |
| `dashboard_activity` | 활동 로그 |
| `dashboard_pending` | 대기 중인 작업 |
| `dashboard_health` | 시스템 상태 |

---

## 15. Quick Examples

### 새 캔버스 생성 및 확장

```typescript
// 1. 캔버스 생성
const result = await canvas_create({
  topic: "TypeScript 제네릭",
  relatedKeywords: ["typescript", "generics", "type-safety"],
  initialQuestions: ["제네릭 기본 문법은?", "타입 추론은 어떻게 동작?"]
});
// → { canvasPath: "03_Canvas/TypeScript_제네릭.canvas", topicNodeId: "text-xxx" }

// 2. 답변 추가
await canvas_expand({
  canvasPath: result.canvasPath,
  anchorId: result.topicNodeId,
  items: [
    { relation: "answers", type: "text", content: "제네릭은 타입을 파라미터화..." },
    { relation: "example", type: "text", content: "function identity<T>(arg: T): T { ... }" },
    { relation: "resource", type: "link", content: "https://www.typescriptlang.org/docs/handbook/2/generics.html" }
  ]
});
```

### 볼트 검색 후 캔버스에 추가

```typescript
// 1. 관련 노트 검색
const notes = await vault_find_related({
  keywords: ["typescript", "generics"],
  limit: 3
});

// 2. 검색된 노트를 캔버스에 추가
for (const note of notes.results) {
  await canvas_add_node({
    canvasPath: "03_Canvas/TypeScript_제네릭.canvas",
    anchorId: topicNodeId,
    relation: "background",
    type: "file",
    content: note.path
  });
}
```

---

## 16. Important Considerations for AI

1. **Canvas 파일 순수성 유지**: JSON Canvas 스펙 외 데이터 삽입 금지
2. **메타데이터 분리**: 워크플로우 정보는 `.meta.json`에만 저장
3. **의미적 관계 우선**: 좌표 직접 지정 대신 Semantic Relation 사용
4. **Zone 특성 이해**: 각 Zone의 의미와 색상 체계 준수
5. **한국어 레이블**: Zone 레이블과 주석은 한국어로 작성됨
6. **v2.1 동적 크기**: 텍스트 노드는 내용 길이에 따라 자동 크기 조절
7. **v2.1 엣지 정책**: `answers`, `resolves` 관계만 엣지 생성, 나머지는 Zone 배치만

---

## Changelog

### v2.1.0 (2025-01)
- **동적 노드 크기**: 텍스트 길이/마크다운 요소 기반 자동 크기 계산
- **엣지 정책 변경**: 핵심 관계만 엣지 생성, Zone 배치로 관계 표현
- **Python CLI 개선**: `canvas_layout.py`, `canvas_config.py` v2.1 업데이트
- **트러블슈팅 확장**: Python CLI 오류 및 레이아웃 엔진 오류 추가

### v2.0.0 (2024-12)
- **Hierarchical Zoning System**: 9개 Zone 기반 레이아웃
- **Semantic Layout Protocol**: relation만 지정, 좌표 자동 계산
- **Dual-Layer Architecture**: MCP Server (TS) + Python CLI

### v1.0.0 (2024-11)
- 초기 MCP Server 구현
- 23개 도구 등록 (Canvas, Vault, Dashboard)

---

*Last Updated: 2025-01-30*
*Generated for: canvas-knowledge-mcp v2.1.0*
