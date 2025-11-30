# Canvas Knowledge System - 최소 공간 규칙 설계 v1

> 단순한 공간 규칙 + 유즈케이스 중심 접근

---

## 1. 설계 철학

### 1.1 원칙

- **단순함 우선**: 규칙은 3개 이하로 유지
- **유즈케이스 중심**: 추상적 시스템보다 실제 사용 패턴
- **도구의 투명성**: 사용자가 시스템을 의식하지 않고 작업에 집중

### 1.2 Obsidian Canvas 제약 수용

사용 가능한 것만 활용:
- 위치 (x, y)
- 크기 (내용 길이에 따라)
- 색상 (1-6)
- 텍스트 (마크다운)

---

## 2. 핵심 공간 규칙 (3개)

```
규칙 1: 중심 = 핵심 (Topic/Question)
규칙 2: 수직축 = 추상화 (위=일반/추상, 아래=구체/상세)
규칙 3: 수평축 = 흐름 (왼쪽=배경/원인, 오른쪽=결과/확장)
```

### 2.1 시각화

```
                 추상/일반
                    ↑
                    │
  배경/원인 ←───── 핵심 ─────→ 결과/확장
                    │
                    ↓
                 구체/상세
```

### 2.2 9개 Zone 의미

| Zone | 위치 | 의미 | 설명 |
|------|------|------|------|
| **CORE** | 중심 | 핵심 | 주제, 질문, 비교 대상 |
| **NORTH** | 위 | 추상/일반 | 상위 개념, 큰 그림, 분류 |
| **SOUTH** | 아래 | 구체/상세 | 정의, 답변, 핵심 요약, 결론 |
| **WEST** | 왼쪽 | 배경/원인 | 맥락, 역사, 전제, 동기 |
| **EAST** | 오른쪽 | 결과/확장 | 응용, 후속, 다음 단계 |
| **NORTH_WEST** | 왼쪽 위 | 추상적 배경 | 이론적 전제, 선행 지식 |
| **NORTH_EAST** | 오른쪽 위 | 추상적 확장 | 관련 개념, 일반화 |
| **SOUTH_WEST** | 왼쪽 아래 | 구체적 배경 | 반례, 예외, 대안 |
| **SOUTH_EAST** | 오른쪽 아래 | 구체적 확장 | 예시, 사례, 적용 |

---

## 3. 유즈케이스

### 3.1 개념 탐구 (Concept Exploration)

**목적**: 하나의 개념/주제를 중심으로 다각도로 파헤치기

```
        NORTH_WEST          NORTH           NORTH_EAST
        (이론적 배경)      (상위 개념)       (관련 개념)
             ↖               ↑               ↗

        WEST                CORE            EAST
        (맥락/역사)    →   🎯 주제   →     (응용/확장)

             ↙               ↓               ↘
        SOUTH_WEST          SOUTH           SOUTH_EAST
        (한계/비판)        (핵심 정의)       (예시/사례)
```

| 항목 | 내용 |
|------|------|
| 시작 노드 | CORE에 주제 |
| 필수 Zone | CORE, SOUTH(정의), SOUTH_EAST(예시) |
| 선택 Zone | 나머지 |
| 핵심 흐름 | CORE → SOUTH → SOUTH_EAST |

---

### 3.2 질문 해결 (Question Solving)

**목적**: 질문에서 답변으로 가는 과정 기록

```
        NORTH_WEST          NORTH           NORTH_EAST
        (전제 지식)       (질문의 맥락)      (관련 질문)
             ↖               ↑               ↗

        WEST                CORE            EAST
        (시도/실패)    →   ❓ 질문   →     (후속 질문)

             ↙               ↓               ↘
        SOUTH_WEST          SOUTH           SOUTH_EAST
        (대안 답변)        ✅ 답변          (적용/검증)
```

| 항목 | 내용 |
|------|------|
| 시작 노드 | CORE에 질문 |
| 필수 Zone | CORE, SOUTH(답변) |
| 선택 Zone | 나머지 |
| 핵심 흐름 | CORE → SOUTH → SOUTH_EAST |

**Zone 활용:**
- WEST: 시도했지만 안 된 것들
- SOUTH_WEST: 다른 가능한 답변
- SOUTH_EAST: 답변을 적용한 결과

---

### 3.3 비교 분석 (Comparative Analysis)

**목적**: A vs B 또는 여러 옵션 비교

```
        NORTH_WEST          NORTH           NORTH_EAST
                          (비교 기준)
                             ↑

        WEST                CORE            EAST
        옵션 A         ⚖️ 비교 주제        옵션 B
        (장단점)            ↓              (장단점)

             ↙               ↓               ↘
        SOUTH_WEST          SOUTH           SOUTH_EAST
        (A 선택 시)        결론/판단        (B 선택 시)
```

| 항목 | 내용 |
|------|------|
| 시작 노드 | CORE에 비교 주제 |
| 필수 Zone | CORE, WEST(A), EAST(B), SOUTH(결론) |
| 핵심 구조 | WEST ↔ EAST (좌우 대칭) |
| 3개 이상 | WEST, CORE, EAST에 나란히 배치 |

---

### 3.4 학습 요약 (Learning Summary)

**목적**: 배운 내용을 구조화하여 정리

```
        NORTH_WEST          NORTH           NORTH_EAST
        (선행 지식)       (큰 그림/분류)     (연결 개념)
             ↖               ↑               ↗

        WEST                CORE            EAST
        (배경/동기)    →  📚 학습 주제  →  (다음 학습)

             ↙               ↓               ↘
        SOUTH_WEST          SOUTH           SOUTH_EAST
        (주의점/함정)     (핵심 요약)       (실습/적용)
```

| 항목 | 내용 |
|------|------|
| 시작 노드 | CORE에 학습 주제 |
| 필수 Zone | CORE, SOUTH(핵심 요약), SOUTH_EAST(실습) |
| 핵심 흐름 | NORTH(전체 구조) → CORE → SOUTH |

**Zone 활용:**
- NORTH: 전체 구조에서 어디에 속하는지
- WEST: 왜 배우는지
- EAST: 다음에 뭘 배울지
- SOUTH_WEST: 흔한 실수, 주의점

---

## 4. 유즈케이스 요약표

| 유즈케이스 | CORE | 핵심 흐름 | 필수 Zone |
|-----------|------|----------|-----------|
| 개념 탐구 | 🎯 주제 | CORE → SOUTH → SE | CORE, SOUTH, SE |
| 질문 해결 | ❓ 질문 | CORE → SOUTH → SE | CORE, SOUTH |
| 비교 분석 | ⚖️ 비교 | WEST ↔ EAST → SOUTH | CORE, WEST, EAST, SOUTH |
| 학습 요약 | 📚 주제 | NORTH → CORE → SOUTH | CORE, SOUTH, SE |

---

## 5. 기존 시스템과의 관계

### 5. 1 변경되는 것

| 항목 | 기존 | 변경 |
|------|------|------|
| Zone 의미 | Relation 기반 (answers→SOUTH) | 공간 규칙 기반 |
| 설계 방향 | 시스템 중심 | 유즈케이스 중심 |
| 복잡도 | Zone + Level + 스타일 | Zone + 최소 규칙 |

### 5.2 유지되는 것

- 9개 Zone 구조
- 색상 시스템 (1-6)
- 동적 노드 크기 계산
- .canvas 파일 형식

### 5.3 보류되는 것 (v2 제안서)

- Level 시스템 (L0-L3)
- 시각적 구분선/배지
- 인라인 YAML 메타데이터
- 뷰 필터링

→ 프론트엔드가 풍부한 환경에서 재검토

---

## 6. 다음 단계

1. CLAUDE.md 업데이트 (공간 규칙 + 유즈케이스)
2. Semantic Relations 재정리 (공간 규칙과 정렬)
3. 유즈케이스별 예시 캔버스 생성
4. 실제 사용 후 피드백 반영

---

*문서 버전: 1.0*
*작성일: 2025-01-30*
