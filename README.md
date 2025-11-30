# Canvas Knowledge MCP Server

Obsidian Canvas 기반 지식 관리 워크플로우를 위한 MCP (Model Context Protocol) 서버입니다.

## 특징

- **Semantic Layout Protocol**: AI Agent는 의미적 관계만 지정하고, 엔진이 Zone 기반 자동 배치
- **Sidecar Metadata Pattern**: 캔버스 파일 순수성을 보존하면서 워크플로우 상태 추적
- **Vault Integration**: 기존 Obsidian 노트와의 연동 및 검색
- **Cross-Reference**: 캔버스 간 연결 및 네트워크 분석

## 설치

```bash
cd canvas-mcp-server
npm install
npm run build
```

## 설정

### Claude Desktop 설정

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) 또는
`%APPDATA%/Claude/claude_desktop_config.json` (Windows)에 추가:

```json
{
  "mcpServers": {
    "canvas-knowledge": {
      "command": "node",
      "args": ["/path/to/canvas-mcp-server/dist/server.js"],
      "env": {
        "VAULT_PATH": "/path/to/your/obsidian/vault",
        "CANVAS_DIR": "03_Canvas"
      }
    }
  }
}
```

### 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `VAULT_PATH` | Obsidian 볼트 경로 | `.` |
| `CANVAS_DIR` | 캔버스 저장 디렉토리 | `03_Canvas` |

## 도구 목록

### Canvas Tools

| 도구 | 설명 |
|------|------|
| `canvas_create` | 새 캔버스 생성 |
| `canvas_expand` | 캔버스에 노드 추가 (여러 개) |
| `canvas_add_node` | 단일 노드 추가 |
| `canvas_info` | 캔버스 정보 조회 |
| `canvas_list_questions` | 질문 노드 목록 |
| `canvas_resolve_question` | 질문 해결 표시 |
| `canvas_crystallize` | 캔버스를 노트로 변환 |

### Vault Tools

| 도구 | 설명 |
|------|------|
| `vault_search` | 노트 검색 |
| `vault_find_related` | 관련 노트 찾기 |
| `vault_note_metadata` | 노트 메타데이터 조회 |
| `vault_build_index` | 볼트 인덱스 빌드 |
| `vault_stats` | 볼트 통계 |
| `canvas_find_related` | 관련 캔버스 찾기 |
| `canvas_search` | 캔버스 검색 |
| `canvas_network` | 캔버스 네트워크 데이터 |
| `canvas_suggest_links` | 링크 제안 |
| `crossref_stats` | 크로스 레퍼런스 통계 |

### Dashboard Tools

| 도구 | 설명 |
|------|------|
| `dashboard_overview` | 전체 대시보드 |
| `dashboard_progress` | 캔버스 진행 상황 |
| `dashboard_list_canvases` | 캔버스 목록 |
| `dashboard_activity` | 활동 로그 |
| `dashboard_pending` | 대기 작업 목록 |
| `dashboard_health` | 시스템 상태 |

## Semantic Layout Protocol

AI Agent는 레이아웃을 직접 다루지 않고, **의미적 관계**만 지정합니다:

```typescript
// Agent가 지정하는 것 (의미적 관계)
{
  relation: "answers",     // 또는 "elaborates", "background", "followUp" 등
  anchorId: "node_123",
  content: { type: "text", text: "답변 내용" }
}

// Engine이 처리하는 것 (Zone 기반 배치)
// "answers" → SOUTH Zone → anchor 아래에 자동 배치
```

### 지원되는 관계

| 관계 | Zone | 설명 |
|------|------|------|
| `answers`, `solution` | SOUTH | 답변/해결책 |
| `elaborates`, `detail` | EAST | 상세 설명 |
| `background`, `source` | WEST | 배경/출처 |
| `followUp`, `related` | SOUTH | 후속 질문 |
| `contrast`, `alternative` | NORTH | 대조/대안 |
| `example` | SE | 예시 |
| `definition` | NW | 정의 |

## 워크플로우 상태

캔버스는 다음 상태를 거칩니다:

```
created → expanded → crystallized → atomized → archived
```

- **created**: 초기 생성됨
- **expanded**: 웹 검색/노트 연결로 확장됨
- **crystallized**: 영구 노트로 요약됨
- **atomized**: 개별 Atomic Notes로 분해됨
- **archived**: 보관됨

## 노드 색상 규칙

| 색상 | 코드 | 역할 |
|------|------|------|
| Red | `1` | Command/Intent 노드, Vault Note 참조 |
| Orange | `2` | Context/배경 정보 |
| Yellow | `3` | Answer/결과 |
| Green | `4` | Question/질문 |
| Cyan | `5` | Resource/참조 자료 |
| Purple | `6` | Topic/주제 |

## 프로젝트 구조

```
canvas-mcp-server/
├── src/
│   ├── server.ts           # MCP 서버 진입점
│   ├── types/
│   │   ├── canvas.ts       # JSON Canvas 타입
│   │   ├── semantic.ts     # Semantic Layout 타입
│   │   ├── meta.ts         # 메타데이터 타입
│   │   ├── vault.ts        # 볼트 인덱스 타입
│   │   └── index.ts
│   ├── engine/
│   │   ├── canvas-parser.ts    # 캔버스 파일 I/O
│   │   ├── semantic-router.ts  # 관계→Zone 라우팅
│   │   ├── layout-engine.ts    # Zone 기반 배치
│   │   ├── meta-manager.ts     # 메타데이터 관리
│   │   ├── vault-indexer.ts    # 볼트 인덱싱
│   │   ├── cross-reference.ts  # 크로스 레퍼런스
│   │   └── index.ts
│   └── tools/
│       ├── canvas-tools.ts     # 캔버스 도구
│       ├── vault-tools.ts      # 볼트 도구
│       ├── dashboard-tools.ts  # 대시보드 도구
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 개발

```bash
# 개발 모드 (watch)
npm run dev

# 빌드
npm run build

# 린트
npm run lint
```

## 라이선스

MIT
