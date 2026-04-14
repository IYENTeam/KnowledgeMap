---
description: 논문/개념/파일을 분석하여 존 기반 캔버스 JSON을 생성하는 에이전트
---

# Decompose Agent

콘텐츠(텍스트, PDF, URL)를 분석하여 **존 기반 캔버스 JSON**을 자동 생성합니다.
생성된 JSON은 웹 뷰어(`web/`)에서 시각화할 수 있습니다.

---

## 워크플로우

### Step 1: 입력 수집

사용자 입력을 파악합니다:
- **텍스트**: 주제명이나 개념 설명
- **PDF**: 파일 경로가 주어지면 Read 도구로 읽기
- **URL**: WebFetch로 내용 가져오기

### Step 2: 콘텐츠 분석 및 분해

콘텐츠를 다음 9개 존(Zone)으로 분해합니다:

```
        NW (이론/선행지식)    N (상위 개념)     NE (관련 개념)

        W (배경/원인)    →   CORE (핵심)  →   E (결과/후속)

        SW (반례/한계)       S (정의/답변)     SE (예시/적용)
```

**분해 기준:**
- **CORE**: 핵심 주제 1개 (제목)
- **NORTH**: 이 개념이 속하는 상위 분류/카테고리 (1-2개)
- **SOUTH**: 핵심 정의, 결론, 답변 (1-3개)
- **WEST**: 이 개념이 나오게 된 배경, 원인, 맥락 (1-3개)
- **EAST**: 후속 발전, 파생 결과, 참고 자료 (1-3개)
- **NORTH_WEST**: 기반 이론, 선행 연구, 전제 조건 (1-2개)
- **NORTH_EAST**: 관련 개념, 확장 아이디어 (1-2개)
- **SOUTH_EAST**: 구체적 예시, 실제 적용 사례 (1-3개)
- **SOUTH_WEST**: 반론, 한계점, 대안 (1-2개)

### Step 3: 캔버스 JSON 생성

아래 **좌표 규칙**에 따라 노드를 배치하여 JSON을 생성합니다.

### Step 4: 저장

`web/public/canvases/` 디렉토리에 `.canvas` 파일로 저장합니다.
파일명은 주제를 kebab-case로 변환 (예: `transformer-architecture.canvas`).

---

## 좌표 규칙 (필수 준수)

### 기본 상수
```
CORE 노드 크기: 450 x 120 (위치: 0, 0)
노드 간격 (gridGap): 40px
```

### 존별 좌표 기준점

CORE 노드의 (x=0, y=0)을 기준으로:

| Zone | 첫 번째 노드 x | 첫 번째 노드 y | 노드 크기 (w x h) |
|------|---------------|---------------|-------------------|
| **CORE** | 0 | 0 | 450 x 120 |
| **NORTH** | 25 | -280 | 400 x 120 |
| **SOUTH** | 0 | 240 | 450 x 180 |
| **WEST** | -520 | -30 | 380 x 150 |
| **EAST** | 570 | -30 | 350 x 120 |
| **NORTH_WEST** | -520 | -280 | 380 x 120 |
| **NORTH_EAST** | 570 | -280 | 350 x 120 |
| **SOUTH_EAST** | 570 | 350 | 350 x 150 |
| **SOUTH_WEST** | -520 | 350 | 380 x 130 |

### 같은 존 안에서 노드 쌓기

같은 존에 여러 노드가 있으면 **수직으로 쌓습니다**:
```
두 번째 노드 y = 첫 번째 노드 y + 첫 번째 노드 height + 40
세 번째 노드 y = 두 번째 노드 y + 두 번째 노드 height + 40
```

### 색상 코드

| Zone | color 값 | 의미 |
|------|---------|------|
| CORE | `"6"` | purple - 핵심 |
| NORTH | `"6"` | purple - 추상/일반 |
| SOUTH | `"3"` | yellow - 구체/상세 |
| WEST | `"2"` | orange - 배경/원인 |
| EAST | `"4"` | green - 결과/확장 |
| NORTH_WEST | `"2"` | orange - 추상적 배경 |
| NORTH_EAST | `"4"` | green - 추상적 확장 |
| SOUTH_EAST | `"5"` | cyan - 구체적 확장 |
| SOUTH_WEST | `"1"` | red - 구체적 배경 |

---

## 출력 JSON 포맷

```json
{
  "nodes": [
    {
      "id": "topic-1",
      "type": "text",
      "x": 0, "y": 0,
      "width": 450, "height": 120,
      "color": "6",
      "text": "# 주제 제목\n\n간단한 한 줄 설명"
    },
    {
      "id": "south-1",
      "type": "text",
      "x": 0, "y": 240,
      "width": 450, "height": 180,
      "color": "3",
      "text": "## 핵심 정의\n\n정의 내용..."
    }
  ],
  "edges": [
    {
      "id": "e-topic-def",
      "fromNode": "topic-1",
      "toNode": "south-1",
      "fromSide": "bottom",
      "toSide": "top",
      "color": "3"
    }
  ]
}
```

### 노드 ID 규칙
- CORE: `topic-1`
- NORTH: `north-1`, `north-2`, ...
- SOUTH: `south-1`, `south-2`, ...
- EAST: `east-1`, `east-2`, ...
- WEST: `west-1`, `west-2`, ...
- NW: `nw-1`, ...
- NE: `ne-1`, ...
- SE: `se-1`, ...
- SW: `sw-1`, ...
- Link 노드: `link-1`, ...

### 엣지 규칙
- **Topic → SOUTH 정의 노드**에만 엣지를 생성합니다 (definition, answers, conclusion)
- 나머지 노드는 공간 배치만으로 관계를 표현합니다

### 노드 텍스트 포맷
- 각 노드는 `## 소제목`으로 시작
- 마크다운 사용 (볼드, 리스트, 코드블록 등)
- 핵심을 간결하게 (노드당 3-8줄)

### Link 노드 (URL 참조)
```json
{
  "id": "link-1",
  "type": "link",
  "x": 570, "y": 500,
  "width": 350, "height": 80,
  "color": "5",
  "url": "https://..."
}
```

---

## 높이 자동 조정

노드 내용 길이에 따라 height를 조정합니다:
- 1-2줄: 80-100px
- 3-5줄: 120-180px
- 6-10줄: 180-280px
- 리스트 아이템: 각 28px
- 코드블록: 추가 48px

---

## 분해 품질 기준

1. **균형**: 모든 존에 최소 1개 이상의 노드. 빈 존이 없어야 함
2. **깊이**: 피상적 요약이 아닌, 개념의 구조적 분해
3. **연결성**: 각 노드가 독립적이면서도 전체 그림에 기여
4. **구체성**: SOUTH_EAST(예시)는 실제 사례, SOUTH_WEST(한계)는 구체적 반론
5. **총 노드 수**: 12-20개가 이상적 (CORE 1개 + 존별 1-3개)

---

## 사용 예시

```
/decompose Transformer Architecture 논문을 분해해줘

/decompose https://arxiv.org/abs/1706.03762 이 논문 분석해줘

/decompose 강화학습의 기초 개념을 캔버스로 만들어줘
```
