# CLAUDE.md - Canvas Knowledge System

> AI 에이전트가 이 코드베이스를 이해하고 효과적으로 작업하기 위한 가이드

---

## 1. Project Overview

**Canvas Knowledge System**은 Obsidian Canvas 기반의 AI 지식 관리 워크플로우를 위한 시스템입니다.

```
Project: canvas-knowledge-mcp v2.2.0
Architecture: Dual-Layer (MCP Server + Agent System)
Languages: TypeScript (ES2022)
Runtime: Node.js 18+
Protocol: MCP (stdio transport)
```

---

## 2. Agent System (v2.2+)

### 2.1 서브 에이전트 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     사용자 요청                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
    │  /canvas  │   │ /research │   │/crystallize│   │  /vault   │
    │  Builder  │   │   Agent   │   │   Agent   │   │  Search   │
    └───────────┘   └───────────┘   └───────────┘   └───────────┘
         │               │               │               │
         └───────────────┴───────────────┴───────────────┘
                                │
                    ┌───────────────────────┐
                    │   MCP Tools (23개)    │
                    └───────────────────────┘
```

### 2.2 에이전트별 역할

| 에이전트 | 명령어 | 역할 | 프롬프트 위치 |
|---------|--------|------|-------------|
| **Canvas Builder** | `/canvas` | 캔버스 생성/확장 | `.claude/commands/canvas.md` |
| **Research** | `/research` | 주제 조사/질문 도출 | `.claude/commands/research.md` |
| **Crystallize** | `/crystallize` | 노트로 결정화 | `.claude/commands/crystallize.md` |
| **Vault Search** | `/vault` | 볼트 검색/연결 | `.claude/commands/vault-search.md` |

### 2.3 사용 예시

```bash
# 캔버스 생성
/canvas "TypeScript 제네릭" 주제로 캔버스 만들어줘

# 조사 및 연구
/research "강화학습 기초"에 대해 조사해줘

# 노트로 변환
/crystallize 현재 캔버스를 요약 노트로 만들어줘

# 볼트 검색
/vault "머신러닝" 관련 노트 찾아줘
```

---

## 3. 핵심 공간 규칙 (Quick Reference)

```
규칙 1: 중심 = 핵심 (Topic/Question)
규칙 2: 수직축 = 추상화 (위=일반, 아래=구체)
규칙 3: 수평축 = 흐름 (왼쪽=배경, 오른쪽=확장)
```

| Zone | 위치 | 의미 | 주요 relation |
|------|------|------|--------------|
| CORE | 중앙 | 핵심 주제 | - |
| NORTH | 위 | 추상/일반 | `category` |
| SOUTH | 아래 | 구체/상세 | `definition`, `answers` |
| WEST | 왼쪽 | 배경/원인 | `background`, `theory` |
| EAST | 오른쪽 | 결과/확장 | `followUp`, `reference` |
| SOUTH_EAST | 오른쪽 아래 | 예시/적용 | `example`, `application` |
| SOUTH_WEST | 왼쪽 아래 | 반례/한계 | `alternative`, `exception` |

> 상세 가이드: `.claude/commands/canvas.md` 참조

---

## 4. Directory Structure

```
knowledgeOS/
├── src/                     # MCP Server (TypeScript)
│   ├── server.ts            # 서버 진입점
│   ├── engine/              # 핵심 엔진
│   │   ├── canvas-parser.ts
│   │   ├── layout-engine.ts
│   │   └── semantic-router.ts
│   ├── tools/               # MCP 도구
│   │   ├── canvas-tools.ts
│   │   ├── vault-tools.ts
│   │   └── dashboard-tools.ts
│   └── types/
│       └── semantic.ts      # 공간 규칙 정의
│
├── .claude/
│   └── commands/            # 서브 에이전트 프롬프트
│       ├── canvas.md
│       ├── research.md
│       ├── crystallize.md
│       └── vault-search.md
│
├── docs/
│   ├── proposals/           # 설계 문서
│   └── reference/           # 상세 레퍼런스
│       └── CLAUDE-full-v2.2.md
│
└── dist/                    # 컴파일된 JS
```

---

## 5. Development Commands

```bash
# 빌드
npm run build

# 개발 모드
npm run dev

# MCP Inspector로 디버깅
npm run inspect

# 테스트
npm test
```

---

## 6. MCP Tools (23개)

### Canvas Tools (7)
`canvas_create`, `canvas_expand`, `canvas_add_node`, `canvas_info`,
`canvas_list_questions`, `canvas_resolve_question`, `canvas_crystallize`

### Vault Tools (10)
`vault_search`, `vault_find_related`, `vault_note_metadata`, `vault_build_index`,
`vault_stats`, `canvas_find_related`, `canvas_search`, `canvas_network`,
`canvas_suggest_links`, `crossref_stats`

### Dashboard Tools (6)
`dashboard_overview`, `dashboard_progress`, `dashboard_list_canvases`,
`dashboard_activity`, `dashboard_pending`, `dashboard_health`

---

## 7. Key Files for Modification

| 변경 사항 | 파일 |
|----------|------|
| 새 Relation 추가 | `src/types/semantic.ts` |
| 레이아웃 규칙 변경 | `src/engine/layout-engine.ts` |
| MCP Tool 추가 | `src/tools/*.ts` + `src/server.ts` |
| 에이전트 동작 변경 | `.claude/commands/*.md` |

---

## 8. Important Notes

1. **에이전트 시스템 사용**: 캔버스 작업 시 `/canvas` 명령어 사용 권장
2. **상세 레퍼런스**: `docs/reference/CLAUDE-full-v2.2.md` 참조
3. **공간 규칙 필수**: 모든 노드 배치는 공간 규칙 준수
4. **useTopicAsAnchor**: 캔버스 확장 시 항상 `true` 설정 권장

---

## Changelog

### v2.2.0 (2025-11)
- **Agent System 도입**: 4개 서브 에이전트로 역할 분리
- **CLAUDE.md 간소화**: 1200줄 → 200줄
- **공간 규칙 단순화**: 3개 핵심 규칙

### v2.1.0 (2025-01)
- 동적 노드 크기, 엣지 정책 변경

### v2.0.0 (2024-12)
- Hierarchical Zoning System, Semantic Layout Protocol

---

*Last Updated: 2025-11-30*
*Version: 2.2.0*
