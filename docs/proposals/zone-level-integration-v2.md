# Zone + Abstraction Level 통합 설계 제안서 v2

> 기존 Zone 시스템과 Abstraction Level의 유기적 통합 방안

---

## 1. 핵심 통찰: 기존 시스템 재해석

### 1.1 현재 Zone 시스템의 숨겨진 구조

기존 Zone 시스템을 분석하면, 이미 **암묵적인 추상화 축**이 존재합니다:

```
                    추상적/일반적
                         ↑
                      NORTH
                   (상위 개념)
                        │
         WEST ←───── CORE ─────→ EAST
      (배경/맥락)    (주제)     (후속/확장)
                        │
                      SOUTH
                   (답변/결론)
                         ↓
                    구체적/특수적
```

**발견 1: Y축은 이미 추상화 방향을 암시**
- NORTH = 상위 개념, 일반화 (더 추상적)
- SOUTH = 답변, 결론 (더 구체적)

**발견 2: X축은 시간/논리 흐름**
- WEST = 선행, 배경 (과거/전제)
- EAST = 후속, 파생 (미래/결과)

**발견 3: 대각선은 조합**
- NORTH_WEST = 추상적 + 선행 = 선행 지식
- SOUTH_EAST = 구체적 + 후속 = 예시/상세

### 1.2 문제 진단

현재 시스템의 한계:

| 문제 | 설명 |
|------|------|
| **동일 Zone 내 구분 불가** | SOUTH에 "정의"와 "비유" 답변이 혼재 |
| **인지 부하 무시** | 전문가/초보자 구분 없이 동일 표시 |
| **학습 경로 부재** | 어디서 시작해서 어디로 가야 할지 불명확 |

---

## 2. 전문가 관점 분석

### 2.1 인지과학 관점 (Dr. Cognitive Load)

> "공간적 배치는 이미 훌륭합니다. 문제는 **깊이(depth)** 차원이 없다는 것입니다."

**제안: Z축 개념 도입**

```
        표면 (Surface)     ←── 직관적 이해 (L0)
             │
        연결 (Bridge)      ←── 개념 연결 (L1)
             │
        실용 (Practical)   ←── 표준 설명 (L2)
             │
        심층 (Deep)        ←── 원론적 정의 (L3)
```

2D Canvas에서 Z축을 표현하는 방법:
1. **레이어 개념** - 같은 위치에 여러 깊이
2. **동심원 개념** - 중심에서 멀어질수록 얕은 설명
3. **색상 명도** - 진할수록 깊은 설명

### 2.2 정보 아키텍처 관점 (Prof. IA)

> "기존 Zone은 **관계(relation)**를 인코딩합니다. Level은 **표현 방식(representation)**을 인코딩해야 합니다. 이 둘은 직교(orthogonal)합니다."

**핵심 원칙: 직교 설계**

```
                    Relation (무엇)
                         │
     background ─────────┼───────── followUp
                         │
                    ─────┼─────  Level (어떻게)
                         │
        formal ──────────┼────────── intuitive
                         │
```

같은 "답변"이라도:
- L3 답변: "함수형 프로그래밍의 참조 투명성에 의해..."
- L0 답변: "레고 블록처럼 조립하는 거야"

### 2.3 시각 디자인 관점 (Design Director)

> "Obsidian Canvas의 제약 내에서 구분해야 합니다. 사용 가능한 시각 변수: **위치, 크기, 색상(6개), 텍스트**"

**시각 변수 할당 현황:**

| 변수 | 현재 용도 | 여유 |
|------|----------|------|
| 위치 (x, y) | Zone 배치 | △ Zone 내 세분화 가능 |
| 크기 (w, h) | 텍스트 길이 | △ Level별 기본 크기 가능 |
| 색상 (1-6) | Zone/Relation | ✗ 이미 사용 중 |
| 텍스트 내용 | 콘텐츠 | ○ 배지/접두사 가능 |

### 2.4 학습과학 관점 (Learning Scientist)

> "학습자는 **나선형(spiral)**으로 학습합니다. 같은 개념을 여러 수준에서 반복 접하며 깊어집니다."

**Bruner의 나선형 교육과정 적용:**

```
Round 1: L0 직관 → L1 질문 → L2 이해
Round 2: L1 심화 질문 → L2 깊은 이해 → L3 형식화
Round 3: L2 응용 → L3 이론 → 새로운 L0 (다른 개념)
```

---

## 3. 통합 설계 제안

### 3.1 핵심 결정: "Zone 내 Level 레이어"

**기존 Zone 구조 유지 + Zone 내부에 Level 깊이 추가**

```
┌─────────────────────────────────────────────────────────────────┐
│                         SOUTH Zone                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Layer 0 (표면)  [L0] 비유/시각적 답변                       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Layer 1 (연결)  [L1] "왜 이렇게 되는 걸까?"                │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Layer 2 (실용)  [L2] 표준 설명 + 예제                      │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ Layer 3 (심층)  [L3] 정의, 형식적 설명                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 구체적 배치 규칙

#### 규칙 1: Y 오프셋으로 Level 표현

**Zone 내에서 Level에 따른 수직 위치 조정:**

```typescript
// Level별 Y 오프셋 (Zone 기준점에서)
const LEVEL_Y_OFFSET: Record<AbstractionLevel, number> = {
  formal:    -60,   // 위쪽 (깊은/추상적)
  standard:    0,   // 기준점
  bridging:  +60,   // 아래쪽
  intuitive: +120,  // 맨 아래 (표면/구체적)
};
```

**시각적 결과:**

```
SOUTH Zone 내부:
     ─────────────────────────
    │ [L3] 정의              │  y = base - 60
     ─────────────────────────
    │ [L2] 표준 설명          │  y = base
     ─────────────────────────
    │ [L1] 연결 질문          │  y = base + 60
     ─────────────────────────
    │ [L0] 비유               │  y = base + 120
     ─────────────────────────
```

#### 규칙 2: 노드 크기로 Level 힌트

```typescript
// Level별 기본 크기 조정
const LEVEL_SIZE_MODIFIER: Record<AbstractionLevel, { w: number; h: number }> = {
  formal:    { w: 0.9,  h: 0.8  },  // 압축적 → 작음
  standard:  { w: 1.0,  h: 1.0  },  // 기준
  bridging:  { w: 0.85, h: 0.9  },  // 질문 → 약간 작음
  intuitive: { w: 1.1,  h: 1.2  },  // 비유/시각 → 여유 있게
};
```

#### 규칙 3: 텍스트 배지 시스템

```typescript
// Level 배지 (노드 텍스트 첫 줄에 삽입)
const LEVEL_BADGE: Record<AbstractionLevel, string> = {
  formal:    '🎯',  // 정확/핵심
  standard:  '📖',  // 설명/학습
  bridging:  '🔗',  // 연결/질문
  intuitive: '🌱',  // 성장/시작
};

// 또는 텍스트 기반:
const LEVEL_TEXT_BADGE: Record<AbstractionLevel, string> = {
  formal:    '[정의]',
  standard:  '[설명]',
  bridging:  '[질문]',
  intuitive: '[비유]',
};
```

### 3.3 새로운 Semantic Relations

#### Level 전환 관계 (신규 추가)

```typescript
// 기존 Relation에 추가
export type LevelTransitionRelation =
  | 'simplifies'    // 더 쉽게 (L3→L2→L1→L0)
  | 'deepens'       // 더 깊게 (L0→L1→L2→L3)
  | 'bridges';      // Level 간 연결

// Zone 매핑: Level Relations는 **같은 Zone 내 수직 이동**
export const LEVEL_RELATION_MAPPING = {
  simplifies: { zoneChange: 'SAME', yOffset: +80 },
  deepens:    { zoneChange: 'SAME', yOffset: -80 },
  bridges:    { zoneChange: 'SAME', yOffset: +40 },
};
```

#### 사용 예시

```typescript
// L3 정의가 있고, 이를 쉽게 설명하는 L0 노드 추가
await canvas_add_node({
  anchorId: 'formal-definition-node',
  relation: 'simplifies',  // 같은 Zone 내에서 아래로 배치
  level: 'intuitive',
  content: '📦 빈 상자에 라벨 붙이는 것처럼...'
});
```

### 3.4 확장된 Zone 시스템 시각화

```
                              NORTH (상위 개념)
                         ┌─────────────────────┐
                         │ [L3] 타입 이론      │
                         │ [L2] 일반화 설명    │
                         │ [L0] "분류하는 것"   │
                         └─────────────────────┘
                                   │
      NORTH_WEST                   │                    NORTH_EAST
   ┌──────────────┐                │                 ┌──────────────┐
   │ [L3] 전제    │                │                 │ [L2] 확장    │
   │ [L2] 배경    │                │                 │ [L0] 응용    │
   └──────────────┘                │                 └──────────────┘
            \                      │                      /
             \                     │                     /
              \                    │                    /
   WEST ───────\───────────────────┼───────────────────/─────── EAST
  (배경 지식)   \                  │                  /      (후속 탐구)
┌────────────┐  \        ┌────────┴────────┐       /  ┌────────────┐
│ [L3] 이론  │   \       │      CORE       │      /   │ [L2] 다음  │
│ [L2] 맥락  │    \      │   🎯 주제       │     /    │ [L1] 궁금  │
│ [L0] 비유  │     \     └────────┬────────┘    /     │ [L0] 예고  │
└────────────┘      \             │            /      └────────────┘
                     \            │           /
                      \           │          /
                       \          │         /
                        \         │        /
      SOUTH_WEST ────────\────────┼───────/──────── SOUTH_EAST
       (대안/반례)        \       │      /          (예시/상세)
    ┌──────────────┐      \      │     /      ┌──────────────┐
    │ [L3] 반론    │       \     │    /       │ [L3] 형식예  │
    │ [L2] 대안    │        \    │   /        │ [L2] 코드예  │
    │ [L0] "반대?" │         \   │  /         │ [L0] 실생활  │
    └──────────────┘          \  │ /          └──────────────┘
                               \ │/
                            ┌───────────────────┐
                            │      SOUTH        │
                            │    (답변/결론)     │
                            │ ┌───────────────┐ │
                            │ │ [L3] 정의     │ │
                            │ │ [L2] 설명     │ │
                            │ │ [L1] 왜?      │ │
                            │ │ [L0] 비유     │ │
                            │ └───────────────┘ │
                            └───────────────────┘
```

---

## 4. 구현 상세

### 4.1 타입 정의

```typescript
// src/types/semantic.ts 확장

/**
 * 추상화 수준 (Abstraction Level)
 */
export type AbstractionLevel = 'formal' | 'standard' | 'bridging' | 'intuitive';

/**
 * Level 스펙
 */
export interface LevelSpec {
  level: AbstractionLevel;
  code: string;           // L0, L1, L2, L3
  label: string;          // 한국어 레이블
  badge: string;          // 텍스트 배지 또는 이모지
  yOffset: number;        // Zone 내 Y 오프셋
  sizeModifier: { w: number; h: number };  // 크기 조정 비율
}

/**
 * Level 스펙 상수
 */
export const LEVEL_SPECS: Record<AbstractionLevel, LevelSpec> = {
  formal: {
    level: 'formal',
    code: 'L3',
    label: '정의',
    badge: '🎯',
    yOffset: -60,
    sizeModifier: { w: 0.9, h: 0.85 },
  },
  standard: {
    level: 'standard',
    code: 'L2',
    label: '설명',
    badge: '📖',
    yOffset: 0,
    sizeModifier: { w: 1.0, h: 1.0 },
  },
  bridging: {
    level: 'bridging',
    code: 'L1',
    label: '연결',
    badge: '🔗',
    yOffset: 60,
    sizeModifier: { w: 0.9, h: 0.9 },
  },
  intuitive: {
    level: 'intuitive',
    code: 'L0',
    label: '비유',
    badge: '🌱',
    yOffset: 120,
    sizeModifier: { w: 1.1, h: 1.15 },
  },
};

/**
 * Level 전환 관계
 */
export type LevelRelation = 'simplifies' | 'deepens' | 'bridges';

/**
 * Level 관계 스펙
 */
export const LEVEL_RELATION_SPECS: Record<LevelRelation, {
  direction: 'down' | 'up' | 'lateral';
  yOffset: number;
  description: string;
}> = {
  simplifies: {
    direction: 'down',
    yOffset: 80,
    description: '더 쉽게 설명 (L3→L0 방향)',
  },
  deepens: {
    direction: 'up',
    yOffset: -80,
    description: '더 깊게 설명 (L0→L3 방향)',
  },
  bridges: {
    direction: 'lateral',
    yOffset: 40,
    description: 'Level 간 연결',
  },
};
```

### 4.2 레이아웃 엔진 확장

```typescript
// src/engine/layout-engine.ts 확장

/**
 * Level을 고려한 노드 위치 계산
 */
function calculatePositionWithLevel(
  basePosition: { x: number; y: number },
  zone: Zone,
  level: AbstractionLevel,
  existingNodes: CanvasNode[]
): { x: number; y: number } {
  const levelSpec = LEVEL_SPECS[level];

  // 기본 Y 오프셋 적용
  let y = basePosition.y + levelSpec.yOffset;

  // 같은 Zone + Level의 기존 노드 확인
  const sameZoneLevelNodes = existingNodes.filter(node => {
    const nodeMeta = getNodeMeta(node.id);
    return nodeMeta?.zone === zone && nodeMeta?.level === level;
  });

  // 충돌 회피: 같은 Level 내에서 X 방향으로 배치
  if (sameZoneLevelNodes.length > 0) {
    const xOffset = sameZoneLevelNodes.length * 420;  // 노드 너비 + gap
    return { x: basePosition.x + xOffset, y };
  }

  return { x: basePosition.x, y };
}

/**
 * Level을 고려한 노드 크기 계산
 */
function calculateSizeWithLevel(
  baseSize: { width: number; height: number },
  level: AbstractionLevel
): { width: number; height: number } {
  const modifier = LEVEL_SPECS[level].sizeModifier;
  return {
    width: Math.round(baseSize.width * modifier.w),
    height: Math.round(baseSize.height * modifier.h),
  };
}
```

### 4.3 API 확장

```typescript
// canvas_add_node 스키마 확장
export const AddNodeSchema = z.object({
  canvasPath: z.string(),
  anchorId: z.string(),
  relation: z.string(),
  type: z.enum(['text', 'file', 'link']),
  content: z.string(),

  // 신규 필드
  level: z.enum(['formal', 'standard', 'bridging', 'intuitive'])
    .optional()
    .default('standard')
    .describe('추상화 수준'),

  addBadge: z.boolean()
    .optional()
    .default(true)
    .describe('Level 배지 자동 추가 여부'),
});
```

### 4.4 배지 삽입 로직

```typescript
/**
 * 텍스트에 Level 배지 추가
 */
export function addLevelBadge(
  text: string,
  level: AbstractionLevel,
  options?: { useEmoji?: boolean }
): string {
  const spec = LEVEL_SPECS[level];
  const badge = options?.useEmoji ? spec.badge : `[${spec.label}]`;

  const lines = text.split('\n');
  const firstLine = lines[0].trim();

  // 이미 배지가 있으면 스킵
  if (firstLine.startsWith('[') || /^[🎯📖🔗🌱]/.test(firstLine)) {
    return text;
  }

  // 헤더가 있으면 헤더 끝에 추가
  if (firstLine.startsWith('#')) {
    lines[0] = `${firstLine} ${badge}`;
  } else {
    // 없으면 첫 줄로 추가
    lines.unshift(badge);
  }

  return lines.join('\n');
}
```

---

## 5. 사용 시나리오

### 5.1 "TypeScript 제네릭" 개념 구조화

```typescript
// 1. 주제 생성
const result = await canvas_create({
  topic: 'TypeScript 제네릭',
});

// 2. L3 원론적 정의 (SOUTH, y 오프셋 -60)
await canvas_add_node({
  canvasPath: result.canvasPath,
  anchorId: result.topicNodeId,
  relation: 'answers',
  level: 'formal',
  content: `## 정의
제네릭(Generics)은 타입을 파라미터로 받아
타입 수준의 다형성을 구현하는 추상화 기법이다.
\`<T>\`를 통해 호출 시점에 구체 타입이 결정된다.`
});

// 3. L2 표준 설명 (SOUTH, y 오프셋 0)
await canvas_add_node({
  canvasPath: result.canvasPath,
  anchorId: result.topicNodeId,
  relation: 'answers',
  level: 'standard',
  content: `## 제네릭 사용법
함수나 클래스를 정의할 때 \`<T>\`로 타입 변수를 선언하고,
사용할 때 구체적인 타입을 전달합니다.

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
identity<string>('hello');
\`\`\``
});

// 4. L1 연결 질문 (SOUTH, y 오프셋 +60)
await canvas_add_node({
  canvasPath: result.canvasPath,
  anchorId: result.topicNodeId,
  relation: 'answers',
  level: 'bridging',
  content: `## 왜 필요할까?
숫자 배열의 첫 번째 요소를 반환하는 함수,
문자열 배열의 첫 번째 요소를 반환하는 함수...
타입마다 함수를 따로 만들어야 할까요?`
});

// 5. L0 직관적 비유 (SOUTH, y 오프셋 +120)
await canvas_add_node({
  canvasPath: result.canvasPath,
  anchorId: result.topicNodeId,
  relation: 'answers',
  level: 'intuitive',
  content: `## 마법 상자 📦

빈 상자에 라벨만 붙여두는 거야!

\`\`\`
[    T    ] ← 아직 뭐가 들어갈지 몰라
     ↓
[  사과   ] ← 사과 넣으면 사과 상자
[  블록   ] ← 블록 넣으면 블록 상자
\`\`\`

상자 모양은 같고, 넣는 것에 따라 달라지는 마법!`
});
```

### 5.2 결과 Canvas 레이아웃

```
                    ┌─────────────────────┐
                    │   🎯 TypeScript     │
                    │      제네릭         │  CORE
                    └──────────┬──────────┘
                               │
                               ▼
           ┌───────────────────────────────────────┐
           │             SOUTH Zone                │
           │                                       │
           │  ┌─────────────────────────────────┐  │
           │  │ 🎯 [정의]                       │  │  y = base - 60
           │  │ 제네릭은 타입 파라미터화...      │  │  (L3)
           │  └─────────────────────────────────┘  │
           │                                       │
           │  ┌─────────────────────────────────┐  │
           │  │ 📖 [설명]                       │  │  y = base
           │  │ 함수나 클래스를 정의할 때...     │  │  (L2)
           │  └─────────────────────────────────┘  │
           │                                       │
           │  ┌─────────────────────────────────┐  │
           │  │ 🔗 [연결]                       │  │  y = base + 60
           │  │ 왜 필요할까?...                  │  │  (L1)
           │  └─────────────────────────────────┘  │
           │                                       │
           │  ┌─────────────────────────────────┐  │
           │  │ 🌱 [비유]                       │  │  y = base + 120
           │  │ 마법 상자 📦...                  │  │  (L0)
           │  └─────────────────────────────────┘  │
           │                                       │
           └───────────────────────────────────────┘
```

### 5.3 학습 경로 시나리오

**초보자 경로 (Bottom-Up):**
```
L0 비유 이해 → L1 "왜?" 이해 → L2 사용법 학습 → L3 정확한 정의 확인
```

**전문가 경로 (Top-Down):**
```
L3 정의 빠른 확인 → (필요시) L0로 설명용 비유 참조
```

**반복 학습 경로 (Spiral):**
```
1차: L0 → L1 → L2
2차: L1 → L2 → L3
3차: L2 → L3 → 새 개념의 L0
```

---

## 6. Level + Zone 조합 매트릭스

### 6.1 권장 조합

| Zone | L3 (정의) | L2 (설명) | L1 (연결) | L0 (비유) |
|------|-----------|-----------|-----------|-----------|
| **CORE** | 주제 정의 | 주제 소개 | - | - |
| **NORTH** | 이론적 상위 개념 | 일반적 분류 | - | 비유적 상위 개념 |
| **SOUTH** | 형식적 답변 | 표준 답변 | 왜? 질문 | 비유적 답변 |
| **EAST** | - | 후속 주제 | 후속 질문 | - |
| **WEST** | 이론적 배경 | 실용적 맥락 | 전제 질문 | 배경 비유 |
| **SOUTH_EAST** | 형식적 예시 | 코드 예시 | 예시 질문 | 실생활 비유 |
| **SOUTH_WEST** | 형식적 반론 | 대안 설명 | 반론 질문 | - |
| **NORTH_WEST** | 선행 이론 | 선행 지식 | - | - |
| **NORTH_EAST** | - | 확장 설명 | 확장 질문 | 확장 비유 |

### 6.2 필수 vs 권장 vs 선택

```
필수 (●): 개념 완성에 반드시 필요
권장 (◐): 있으면 학습 효과 증대
선택 (○): 상황에 따라

Zone      L3    L2    L1    L0
─────────────────────────────
CORE      ●     ◐     ○     ○
SOUTH     ●     ●     ◐     ●
SOUTH_EAST ◐    ●     ○     ●
WEST      ○     ◐     ○     ○
```

---

## 7. 기존 시스템과의 호환성

### 7.1 하위 호환

- **level 미지정 시**: `standard` (L2)로 기본 처리
- **기존 API 동작**: 변경 없음 (level은 optional)
- **기존 Canvas 파일**: 그대로 작동 (메타데이터만 확장)

### 7.2 마이그레이션

```typescript
// 기존 노드에 Level 추론 적용
async function migrateToLevelSystem(canvasPath: string) {
  const canvas = await loadCanvas(canvasPath);

  for (const node of canvas.nodes) {
    if (node.type === 'text') {
      const inferredLevel = inferLevelFromText(node.text);
      await updateNodeMeta(canvasPath, node.id, { level: inferredLevel });
    }
  }
}
```

---

## 8. 대안 설계와의 비교

### Option A: 완전 분리 (별도 Canvas)

```
Topic_L3.canvas  - 전문가용
Topic_L2.canvas  - 학습자용
Topic_L0.canvas  - 입문자용
```

**단점**: 중복, 동기화 문제, 관계 파편화

### Option B: Zone 재정의 (Level을 Zone으로)

```
SOUTH_L3, SOUTH_L2, SOUTH_L1, SOUTH_L0  → 36개 Zone
```

**단점**: 복잡도 폭발, 기존 시스템 파괴

### Option C: 본 제안 (Zone 내 Level 레이어) ✅

```
기존 9개 Zone 유지 + Zone 내 Y 오프셋으로 4 Level 표현
```

**장점**:
- 기존 시스템 완전 호환
- 점진적 도입 가능
- 직관적 시각화
- 학습 경로 자연스럽게 표현

---

## 9. 요약

### 핵심 설계 원칙

1. **Zone은 관계(무엇)**를 인코딩 - 기존 유지
2. **Level은 표현(어떻게)**을 인코딩 - 신규 추가
3. **Y 오프셋으로 깊이 표현** - Zone 내 수직 배치
4. **배지로 시각적 구분** - 이모지 또는 텍스트

### 핵심 공식

```
노드 위치 = Zone 기준점 + Level Y 오프셋 + 충돌 회피 조정
노드 크기 = 텍스트 기반 크기 × Level 크기 조정 비율
노드 텍스트 = Level 배지 + 원본 콘텐츠
```

### 새로운 Relations

| Relation | 동작 | 설명 |
|----------|------|------|
| `simplifies` | 같은 Zone, Y +80 | 더 쉽게 설명 |
| `deepens` | 같은 Zone, Y -80 | 더 깊게 설명 |
| `bridges` | 같은 Zone, Y +40 | Level 간 연결 |

---

*문서 버전: 2.0*
*작성일: 2025-01-30*
*대상 버전: canvas-knowledge-mcp v2.2.0*
