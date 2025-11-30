# Canvas Knowledge Agent Architecture v1.0

## 1. 문제 정의

### 현재 문제점
- CLAUDE.md가 1200+ 줄로 너무 길어 Agent가 핵심 정보를 놓침
- `elaborates` relation만 반복 사용하여 레이아웃 규칙 무시
- 범용 Agent가 모든 작업을 처리하려다 전문성 부족

### 목표
- 전문화된 서브 에이전트로 역할 분리
- 각 에이전트가 짧고 명확한 프롬프트만 참조
- 일관된 캔버스 레이아웃 생성

---

## 2. 에이전트 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     Orchestrator Agent                          │
│                   (사용자 요청 분석 및 라우팅)                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┬───────────────┐
          ▼               ▼               ▼               ▼
    ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
    │  Canvas   │   │  Research │   │ Crystallize│   │   Vault   │
    │  Builder  │   │   Agent   │   │   Agent   │   │  Search   │
    │   Agent   │   │           │   │           │   │   Agent   │
    └───────────┘   └───────────┘   └───────────┘   └───────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    MCP Tools (23개)                         │
    │  canvas_create, canvas_expand, vault_search, etc.           │
    └─────────────────────────────────────────────────────────────┘
```

---

## 3. 에이전트 정의

### 3.1 Orchestrator Agent (오케스트레이터)

**역할**: 사용자 요청을 분석하고 적절한 서브 에이전트로 라우팅

**트리거**: 모든 캔버스 관련 요청의 진입점

**프롬프트 크기**: ~200줄

```yaml
책임:
  - 사용자 의도 파악
  - 적절한 서브 에이전트 선택
  - 작업 결과 통합 및 보고

라우팅 규칙:
  - "캔버스 생성/확장" → Canvas Builder Agent
  - "조사/연구/탐구" → Research Agent
  - "정리/요약/노트화" → Crystallize Agent
  - "검색/찾기" → Vault Search Agent
```

### 3.2 Canvas Builder Agent (캔버스 빌더)

**역할**: 캔버스 생성 및 노드 배치 전문

**핵심 지식**:
- 공간 규칙 3개
- Relation → Zone 매핑
- useTopicAsAnchor 패턴

**프롬프트 크기**: ~150줄 (핵심만)

```yaml
MCP Tools:
  - canvas_create
  - canvas_expand
  - canvas_add_node
  - canvas_info

필수 규칙:
  1. 모든 노드는 Topic 기준으로 배치 (useTopicAsAnchor: true)
  2. 내용 유형에 따라 적절한 relation 선택
  3. elaborates만 사용 금지
```

### 3.3 Research Agent (리서치)

**역할**: 주제 조사 및 정보 수집

**핵심 지식**:
- 유즈케이스별 탐구 패턴
- 질문 생성 및 해결 흐름

**프롬프트 크기**: ~100줄

```yaml
MCP Tools:
  - vault_search
  - vault_find_related
  - canvas_list_questions
  - canvas_resolve_question

작업 흐름:
  1. 주제 분석 및 핵심 질문 도출
  2. 볼트에서 관련 자료 검색
  3. Canvas Builder에게 구조화된 정보 전달
```

### 3.4 Crystallize Agent (결정화)

**역할**: 캔버스를 영구 노트로 변환

**핵심 지식**:
- Zone별 내용 우선순위
- 마크다운 구조화 패턴

**프롬프트 크기**: ~80줄

```yaml
MCP Tools:
  - canvas_crystallize
  - canvas_info

출력 형식:
  - summary: 핵심 요약
  - detailed: 상세 내용
  - outline: 아웃라인
```

### 3.5 Vault Search Agent (볼트 검색)

**역할**: 볼트 내 노트 검색 및 연결

**프롬프트 크기**: ~60줄

```yaml
MCP Tools:
  - vault_search
  - vault_find_related
  - canvas_suggest_links
  - crossref_stats
```

---

## 4. 구현 방식

### 4.1 Claude Code Slash Commands 활용

```
.claude/
├── commands/
│   ├── canvas.md           # Canvas Builder Agent
│   ├── research.md         # Research Agent
│   ├── crystallize.md      # Crystallize Agent
│   └── vault-search.md     # Vault Search Agent
└── settings.local.json
```

### 4.2 Slash Command 구조

```markdown
# /canvas - Canvas Builder Agent

## Role
캔버스 생성 및 노드 배치 전문 에이전트

## Core Rules
[핵심 규칙만 포함 - 150줄 이내]

## Available Tools
- canvas_create
- canvas_expand
- canvas_add_node
- canvas_info

## Relation Selection Guide
[테이블 형식의 간결한 가이드]
```

### 4.3 호출 방식

```bash
# 사용자가 직접 서브 에이전트 호출
/canvas "TypeScript 제네릭" 주제로 캔버스 생성해줘

# 또는 Orchestrator가 자동 라우팅
"TypeScript 제네릭에 대해 캔버스로 정리해줘"
→ Orchestrator → /canvas 호출
```

---

## 5. 프롬프트 분리 전략

### 5.1 CLAUDE.md 역할 축소

**Before (1200+ 줄)**
- 프로젝트 개요
- 아키텍처
- 공간 규칙
- 유즈케이스
- API Reference
- Troubleshooting
- ...

**After (~300줄)**
- 프로젝트 개요
- 아키텍처 개요
- 에이전트 시스템 안내
- 개발 가이드 (코드 수정용)

### 5.2 에이전트별 프롬프트

| 에이전트 | 파일 | 줄 수 | 핵심 내용 |
|---------|------|------|----------|
| Canvas Builder | `.claude/commands/canvas.md` | ~150 | 공간 규칙, Relation 가이드 |
| Research | `.claude/commands/research.md` | ~100 | 유즈케이스, 질문 패턴 |
| Crystallize | `.claude/commands/crystallize.md` | ~80 | Zone 우선순위, 출력 형식 |
| Vault Search | `.claude/commands/vault-search.md` | ~60 | 검색 전략, 연결 패턴 |

---

## 6. 장점

1. **전문성**: 각 에이전트가 자신의 역할에만 집중
2. **프롬프트 효율성**: 짧은 프롬프트로 핵심 정보만 전달
3. **유지보수성**: 기능별로 독립적으로 수정 가능
4. **확장성**: 새로운 에이전트 쉽게 추가
5. **디버깅**: 문제 발생 시 해당 에이전트만 확인

---

## 7. 다음 단계

1. [ ] `.claude/commands/` 디렉토리 생성
2. [ ] Canvas Builder Agent 프롬프트 작성
3. [ ] Research Agent 프롬프트 작성
4. [ ] Crystallize Agent 프롬프트 작성
5. [ ] Vault Search Agent 프롬프트 작성
6. [ ] CLAUDE.md 리팩토링 (300줄 이내로)
7. [ ] 테스트 및 검증

---

*Created: 2025-11-30*
*Version: 1.0*
