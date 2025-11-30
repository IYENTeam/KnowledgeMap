# Cognitive Abstraction Levels 통합 제안서

> Canvas Knowledge System v2.2를 위한 인지 부하 최적화 설계

---

## 1. Executive Summary

### 1.1 현재 시스템 분석

현재 Canvas Knowledge System은 **공간적(spatial) 관계**에 집중된 Zone 시스템을 사용합니다:

```
현재 체계: Semantic Relation → Zone → 공간 배치
- answers → SOUTH (아래)
- background → WEST (왼쪽)
- example → SOUTH_EAST (오른쪽 아래)
```

**강점:**
- 관계의 종류(답변, 배경, 예시 등)를 공간으로 직관적 표현
- 색상 코딩으로 역할 구분
- 자동 레이아웃으로 AI 에이전트 부담 감소

**한계:**
- **추상화 수준(Abstraction Level)이 부재** - 같은 "답변"이라도 전문가용/초보자용 구분 없음
- **인지 부하 고려 없음** - 복잡한 설명과 단순한 설명이 동일하게 취급됨
- **학습 경로 지원 미흡** - 사용자가 어디서부터 읽어야 할지 알 수 없음

### 1.2 제안 핵심

**2차원 의미 체계(Two-Dimensional Semantic System)**로 확장:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   축 1: Relation (관계 유형) - 기존 유지                      │
│   → "이 노드가 무엇인가?" (답변, 배경, 예시, 대안...)          │
│                                                             │
│   축 2: Abstraction Level (추상화 수준) - 신규 추가           │
│   → "얼마나 깊이/쉽게 설명하는가?" (원론적 ↔ 직관적)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 인지 과학 기반 설계 원칙

### 2.1 인지 부하 이론 (Cognitive Load Theory)

John Sweller의 인지 부하 이론에 따르면:

| 부하 유형 | 설명 | 시스템 대응 |
|-----------|------|------------|
| **내재적 부하** (Intrinsic) | 개념 자체의 복잡성 | Abstraction Level로 단계화 |
| **외재적 부하** (Extraneous) | 불필요한 정보 처리 | 사용자 수준에 맞는 노드만 표시 |
| **본유적 부하** (Germane) | 스키마 구축에 필요한 노력 | Bridging 노드로 연결 지원 |

### 2.2 전문성 역전 효과 (Expertise Reversal Effect)

> "전문가에게 효과적인 학습 자료가 초보자에게는 방해가 되고, 그 반대도 마찬가지다."

**시스템 적용:**
- 전문가: FORMAL 레벨 노드로 빠른 참조
- 초보자: INTUITIVE 레벨에서 시작, 점진적 상승
- 중급자: 필요에 따라 레벨 이동

### 2.3 스캐폴딩 이론 (Scaffolding Theory)

Vygotsky의 근접발달영역(ZPD) 개념:

```
┌──────────────────────────────────────────────────────────────┐
│                     혼자서는 이해 불가                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              근접발달영역 (ZPD)                          │  │
│  │   ┌──────────────────────────────────────────────────┐ │  │
│  │   │           혼자서 이해 가능                        │ │  │
│  │   │                                                  │ │  │
│  │   └──────────────────────────────────────────────────┘ │  │
│  │          ↑                                             │  │
│  │    Bridging 노드가 이 영역을 지원                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.4 이중 코딩 이론 (Dual Coding Theory)

Allan Paivio의 이론 - 언어적 + 시각적 정보가 함께 제공될 때 학습 효과 증대:

| Level | 언어적 표현 | 시각적 표현 |
|-------|------------|------------|
| FORMAL | 정의, 공식, 전문용어 | 다이어그램, 수식 |
| STANDARD | 일반적 설명 | 개념도, 플로우차트 |
| BRIDGING | 질문, 동기부여 | 비교표, 연결선 |
| INTUITIVE | 비유, 일상언어 | 아이콘, 이모지, 스케치 |

---

## 3. Abstraction Level 정의

### 3.1 4단계 추상화 수준

```typescript
type AbstractionLevel = 'formal' | 'standard' | 'bridging' | 'intuitive';
```

| Level | 코드 | 대상 | 특징 | 예시 |
|-------|------|------|------|------|
| **FORMAL** | `L3` | 전문가, 빠른 참조 | 압축적, 정확, 전문용어 | "제네릭은 타입 파라미터화를 통한 다형성 구현 기법" |
| **STANDARD** | `L2` | 중급 학습자 | 균형잡힌 설명, 구조화 | "제네릭을 사용하면 하나의 함수가 여러 타입에서 동작할 수 있습니다" |
| **BRIDGING** | `L1` | 개념 연결 | 질문, 동기부여, 왜? | "왜 타입마다 같은 함수를 반복 작성해야 할까요?" |
| **INTUITIVE** | `L0` | 12살도 이해 | 비유, 시각적, 일상언어 | "레고 블록처럼 어떤 모양이든 끼울 수 있는 범용 연결고리" |

### 3.2 Level별 콘텐츠 가이드라인

#### FORMAL (L3) - 원론적/압축적

```markdown
## 작성 가이드
- 정의(Definition)로 시작
- 전문 용어 사용 (괄호 안 영문 병기)
- 수식/코드 적극 활용
- 1-2문장으로 핵심 압축
- 참조용으로 빠르게 스캔 가능

## 예시
"TypeScript 제네릭(Generics)은 타입을 파라미터로 받아
재사용 가능한 컴포넌트를 생성하는 타입 수준의 추상화 기법이다.
`<T>`를 통해 호출 시점에 타입이 결정된다."
```

#### STANDARD (L2) - 일반적 설명

```markdown
## 작성 가이드
- "~란/이란"으로 시작하지 않음 (정의 반복 피함)
- 동작 원리와 사용법 중심
- 단계별 설명 구조
- 간단한 예제 코드 포함
- 3-5문장 적정

## 예시
"제네릭을 사용하면 함수나 클래스를 정의할 때
구체적인 타입을 지정하지 않고, 사용할 때 타입을 전달할 수 있습니다.

function identity<T>(arg: T): T {
  return arg;
}

identity<string>('hello'); // 타입: string
identity<number>(42);      // 타입: number"
```

#### BRIDGING (L1) - 간격 메우기

```markdown
## 작성 가이드
- 질문으로 시작 ("왜?", "어떻게?", "만약?")
- 문제 상황 제시
- 개념 간 연결고리 역할
- 학습 동기 유발
- "~하면 어떨까요?" 형태

## 예시
"만약 숫자 배열과 문자열 배열을 각각 처리하는
함수를 따로 만들어야 한다면?

function getFirstNumber(arr: number[]): number { ... }
function getFirstString(arr: string[]): string { ... }

이 반복을 없앨 방법이 있을까요?"
```

#### INTUITIVE (L0) - 12살도 이해

```markdown
## 작성 가이드
- 비유/메타포 사용 (일상 사물)
- 시각적 표현 (이모지, ASCII art)
- 전문용어 배제
- 스토리텔링 방식
- "~처럼", "~라고 생각해봐" 형태

## 예시
"📦 빈 상자에 라벨만 붙여두는 거야.

[    T    ] ← 아직 뭐가 들어갈지 몰라!
     ↓
[  사과   ] ← 사과 넣으면 사과 상자
[  블록   ] ← 블록 넣으면 블록 상자

상자 모양은 같은데, 넣는 것에 따라 달라지는 마법 상자!"
```

### 3.3 Level 간 관계

```
         읽기 방향 (초보자)
              ↓
    ┌─────────────────┐
    │    INTUITIVE    │  L0: 직관적 이해
    │    (비유/시각)   │
    └────────┬────────┘
             │ "이게 왜 필요해?"
    ┌────────▼────────┐
    │    BRIDGING     │  L1: 동기/연결
    │   (질문/동기)    │
    └────────┬────────┘
             │ "어떻게 사용해?"
    ┌────────▼────────┐
    │    STANDARD     │  L2: 실용적 이해
    │   (설명/예제)    │
    └────────┬────────┘
             │ "정확히 뭐야?"
    ┌────────▼────────┐
    │     FORMAL      │  L3: 정밀한 정의
    │   (정의/공식)    │
    └─────────────────┘
              ↑
         읽기 방향 (전문가)
```

---

## 4. 시스템 통합 설계

### 4.1 통합 방식 비교 분석

#### Option A: 새로운 Semantic Relation 추가

```typescript
// 새 관계 추가
type SemanticRelation =
  | 'answers'
  | 'simplifies'     // 신규: L2 → L0/L1
  | 'formalizes'     // 신규: L0/L1 → L3
  | 'bridges'        // 신규: 레벨 간 연결
  | ...
```

**장점:** 기존 Zone 시스템과 호환
**단점:** 관계 수 폭증, Zone 매핑 복잡화

#### Option B: 노드 메타데이터에 level 필드 추가 ✅ 권장

```typescript
// 노드 메타데이터 확장
interface NodeMeta {
  role: NodeRole;
  status: NodeStatus;
  level?: AbstractionLevel;  // 신규 필드
  // ...
}
```

**장점:**
- 기존 Relation/Zone 체계 유지
- 메타데이터로 분리되어 Canvas 순수성 유지
- 필터링/뷰 전환에 유연
- 점진적 도입 가능

**단점:**
- 시각적 표현 방법 별도 필요

#### Option C: Zone 배치에 level 반영 (수직 오프셋)

```
SOUTH Zone 내부:
  ┌─────────────────────────────────────────┐
  │  y=-100: FORMAL answers                 │
  │  y=0:    STANDARD answers               │
  │  y=+100: BRIDGING answers               │
  │  y=+200: INTUITIVE answers              │
  └─────────────────────────────────────────┘
```

**장점:** 시각적으로 level 구분 명확
**단점:** 공간 사용 비효율, 복잡도 증가

### 4.2 권장 설계: Option B + 시각적 표현

**핵심 원칙:**
1. 기존 Relation → Zone 매핑 유지
2. Level은 메타데이터로 관리
3. 시각적 구분은 **노드 스타일**로 표현

```
┌──────────────────────────────────────────────────────────────┐
│  2차원 의미 체계                                              │
│                                                              │
│         FORMAL    STANDARD   BRIDGING   INTUITIVE            │
│           L3         L2         L1         L0                │
│  ────────────────────────────────────────────────────        │
│  answers   ●──────────●──────────●──────────●                │
│  example   ●──────────●──────────●──────────●                │
│  background●──────────●──────────●──────────●                │
│  ...                                                         │
│                                                              │
│  ● = 가능한 노드 조합                                         │
│  Zone = Relation으로 결정 (기존 방식)                         │
│  스타일 = Level로 결정 (신규)                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. 상세 구현 설계

### 5.1 타입 정의 확장

```typescript
// src/types/semantic.ts 확장

/**
 * 추상화 수준 - 인지 부하 기반 4단계
 */
export type AbstractionLevel = 'formal' | 'standard' | 'bridging' | 'intuitive';

/**
 * Level 스펙 정의
 */
export interface LevelSpec {
  level: AbstractionLevel;
  code: string;           // L0, L1, L2, L3
  label: string;          // 한국어 레이블
  description: string;    // 설명
  targetAudience: string; // 대상 독자
  visualStyle: LevelVisualStyle;
}

/**
 * Level별 시각적 스타일
 */
export interface LevelVisualStyle {
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderWidth: number;
  opacity: number;        // 노드 배경 투명도
  fontWeight: 'normal' | 'bold';
  badge?: string;         // 좌상단 배지 (L0, L1, L2, L3)
}

/**
 * Level 스펙 상수
 */
export const LEVEL_SPECS: Record<AbstractionLevel, LevelSpec> = {
  formal: {
    level: 'formal',
    code: 'L3',
    label: '원론적',
    description: '압축적이고 정확한 전문 정의',
    targetAudience: '전문가, 빠른 참조',
    visualStyle: {
      borderStyle: 'double',
      borderWidth: 3,
      opacity: 1.0,
      fontWeight: 'bold',
      badge: 'L3'
    }
  },
  standard: {
    level: 'standard',
    code: 'L2',
    label: '표준',
    description: '균형잡힌 일반적 설명',
    targetAudience: '중급 학습자',
    visualStyle: {
      borderStyle: 'solid',
      borderWidth: 2,
      opacity: 0.95,
      fontWeight: 'normal',
      badge: 'L2'
    }
  },
  bridging: {
    level: 'bridging',
    code: 'L1',
    label: '연결',
    description: '개념 간 연결, 질문, 동기부여',
    targetAudience: '개념 전환이 필요한 학습자',
    visualStyle: {
      borderStyle: 'dashed',
      borderWidth: 2,
      opacity: 0.85,
      fontWeight: 'normal',
      badge: 'L1'
    }
  },
  intuitive: {
    level: 'intuitive',
    code: 'L0',
    label: '직관적',
    description: '비유와 시각적 표현으로 쉬운 설명',
    targetAudience: '초보자, 12살도 이해',
    visualStyle: {
      borderStyle: 'dotted',
      borderWidth: 2,
      opacity: 0.75,
      fontWeight: 'normal',
      badge: 'L0'
    }
  }
};
```

### 5.2 메타데이터 스키마 확장

```typescript
// src/types/meta.ts 확장

/**
 * 확장된 노드 메타데이터
 */
export interface NodeMeta {
  role: NodeRole;
  status: NodeStatus;

  // 신규 필드
  level?: AbstractionLevel;           // 추상화 수준
  levelExplicit?: boolean;           // 명시적 지정 여부 (vs 추론)
  relatedLevels?: {                   // 다른 레벨의 관련 노드
    formal?: string;                  // L3 버전 노드 ID
    standard?: string;                // L2 버전 노드 ID
    bridging?: string;                // L1 버전 노드 ID
    intuitive?: string;               // L0 버전 노드 ID
  };

  // 기존 필드
  intent?: string;
  resolvedBy?: string[];
  createdAt?: string;
}
```

### 5.3 새로운 Semantic Relations

Level 간 이동을 위한 관계 추가:

```typescript
// 추가 Semantic Relations
export type LevelRelation =
  | 'simplifies'      // 더 쉽게 설명 (L3→L2→L1→L0 방향)
  | 'formalizes'      // 더 정밀하게 정의 (L0→L1→L2→L3 방향)
  | 'bridges';        // 레벨 간 연결 (양방향)

// Zone 매핑 - Level Relations는 같은 Zone 내 수직 배치
export const LEVEL_RELATION_BEHAVIOR: Record<LevelRelation, {
  zoneOffset: 'same' | 'adjacent';
  verticalOffset: number;  // px
}> = {
  simplifies: { zoneOffset: 'same', verticalOffset: 150 },
  formalizes: { zoneOffset: 'same', verticalOffset: -150 },
  bridges: { zoneOffset: 'same', verticalOffset: 75 }
};
```

### 5.4 Level 자동 추론 로직

```typescript
// src/engine/level-inference.ts

/**
 * 텍스트 분석을 통한 Level 자동 추론
 */
export function inferLevel(text: string): AbstractionLevel {
  const indicators = {
    formal: {
      patterns: [
        /^정의:/,
        /이란\s/,
        /~을 의미한다/,
        /\([A-Za-z]+\)/,  // 영문 병기
        /```[\w]*\n/,      // 코드 블록
      ],
      keywords: ['정의', '개념', '원리', '이론', '공식']
    },
    standard: {
      patterns: [
        /~합니다/,
        /~입니다/,
        /예를 들어/,
        /방법은/,
      ],
      keywords: ['사용', '방법', '예제', '코드', '구현']
    },
    bridging: {
      patterns: [
        /\?$/m,           // 물음표로 끝남
        /왜\s/,
        /어떻게\s/,
        /만약\s/,
        /~할까요\?/,
      ],
      keywords: ['왜', '어떻게', '만약', '필요']
    },
    intuitive: {
      patterns: [
        /~처럼/,
        /~같은/,
        /생각해봐/,
        /[\u{1F300}-\u{1F9FF}]/u,  // 이모지
      ],
      keywords: ['비유', '상상', '예를 들면', '쉽게']
    }
  };

  let scores: Record<AbstractionLevel, number> = {
    formal: 0,
    standard: 0,
    bridging: 0,
    intuitive: 0
  };

  for (const [level, { patterns, keywords }] of Object.entries(indicators)) {
    // 패턴 매칭 점수
    for (const pattern of patterns) {
      if (pattern.test(text)) scores[level as AbstractionLevel] += 2;
    }
    // 키워드 점수
    for (const keyword of keywords) {
      if (text.includes(keyword)) scores[level as AbstractionLevel] += 1;
    }
  }

  // 최고 점수 레벨 반환 (기본값: standard)
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'standard';

  return Object.entries(scores)
    .find(([_, score]) => score === maxScore)?.[0] as AbstractionLevel || 'standard';
}
```

### 5.5 시각적 표현 (Canvas 노드 스타일)

Canvas 노드 `text` 필드에 Level 배지 삽입:

```typescript
/**
 * Level 배지가 포함된 텍스트 생성
 */
export function addLevelBadge(text: string, level: AbstractionLevel): string {
  const spec = LEVEL_SPECS[level];
  const badge = `[${spec.code}]`;  // [L0], [L1], [L2], [L3]

  // 첫 줄에 배지 추가
  const lines = text.split('\n');
  if (lines[0].startsWith('#')) {
    // 헤더가 있으면 헤더 뒤에
    lines[0] = lines[0] + ` ${badge}`;
  } else {
    // 없으면 첫 줄 앞에
    lines.unshift(badge);
  }

  return lines.join('\n');
}

/**
 * Level에 따른 노드 색상 조정
 * (기존 Zone 색상에 Level 기반 변형)
 */
export function adjustColorByLevel(
  zoneColor: string,
  level: AbstractionLevel
): string {
  // 색상은 유지하되, CSS 클래스로 스타일 변형 암시
  // Obsidian Canvas는 color만 지원하므로 배지로 구분
  return zoneColor;
}
```

### 5.6 API 확장

```typescript
// canvas_add_node 파라미터 확장
export const AddNodeSchema = z.object({
  canvasPath: z.string(),
  anchorId: z.string(),
  relation: z.string(),
  type: z.enum(['text', 'file', 'link']),
  content: z.string(),

  // 신규 파라미터
  level: z.enum(['formal', 'standard', 'bridging', 'intuitive'])
    .optional()
    .describe('추상화 수준 (미지정시 자동 추론)'),

  linkToLevelNode: z.string()
    .optional()
    .describe('연결할 다른 레벨 노드 ID'),
});
```

---

## 6. 사용자 경험 설계

### 6.1 Level 기반 뷰 모드

```
┌──────────────────────────────────────────────────────────────┐
│  Canvas 뷰 모드 선택                                          │
│                                                              │
│  [🎓 전문가 뷰]  - L3 + L2 노드만 표시                        │
│  [📚 학습자 뷰]  - L2 + L1 노드 표시                         │
│  [🌱 입문자 뷰]  - L0 + L1 노드 표시                         │
│  [🔍 전체 뷰]    - 모든 레벨 표시                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Level 탐색 경로

```
입문자 학습 경로:
┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
│   L0   │───▶│   L1   │───▶│   L2   │───▶│   L3   │
│ 직관적  │    │ 연결   │    │ 표준   │    │ 원론적  │
└────────┘    └────────┘    └────────┘    └────────┘
"비유 이해"  "왜 필요한지"  "사용법"    "정확한 정의"

전문가 참조 경로:
┌────────┐    ┌────────┐
│   L3   │───▶│   L0   │  (필요시 설명용)
│ 원론적  │    │ 직관적  │
└────────┘    └────────┘
"빠른 참조"  "타인에게 설명할 때"
```

### 6.3 자동 Level 제안

AI 에이전트가 노드 생성 시:

```typescript
// 컨텍스트 기반 Level 제안
function suggestLevel(context: {
  existingLevels: AbstractionLevel[];  // 이미 있는 레벨들
  relation: SemanticRelation;
  userPreference?: AbstractionLevel;
}): AbstractionLevel {
  const { existingLevels, relation, userPreference } = context;

  // 사용자 선호 우선
  if (userPreference) return userPreference;

  // 누락된 레벨 우선 제안
  const allLevels: AbstractionLevel[] = ['formal', 'standard', 'bridging', 'intuitive'];
  const missing = allLevels.filter(l => !existingLevels.includes(l));

  if (missing.length > 0) {
    // answers 관계는 standard → formal → intuitive → bridging 순
    if (relation === 'answers') {
      const priority = ['standard', 'formal', 'intuitive', 'bridging'];
      return priority.find(p => missing.includes(p as AbstractionLevel)) as AbstractionLevel;
    }
    // example은 intuitive 우선
    if (relation === 'example') {
      return missing.includes('intuitive') ? 'intuitive' : missing[0];
    }
  }

  return 'standard';  // 기본값
}
```

---

## 7. 마이그레이션 전략

### 7.1 하위 호환성

- **기존 노드:** `level` 미지정 노드는 `standard`로 간주
- **기존 API:** `level` 파라미터는 optional
- **기존 Canvas:** 변경 없이 동작

### 7.2 점진적 도입

```
Phase 1: 타입 & 메타데이터 추가 (비파괴적)
  - LevelSpec 타입 정의
  - NodeMeta.level 필드 추가
  - Level 추론 로직 구현

Phase 2: API 확장
  - canvas_add_node에 level 파라미터 추가
  - 배지 삽입 로직 구현
  - Level Relations (simplifies, formalizes) 추가

Phase 3: 시각화 & UX
  - 뷰 모드 필터링
  - Level 기반 검색
  - 학습 경로 가이드
```

---

## 8. 예시 시나리오

### 8.1 "TypeScript 제네릭" 캔버스

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              NORTH                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ [L3] 타입 이론 (Type Theory)                                     │   │
│  │ "파라메트릭 다형성의 TypeScript 구현"                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├────────────────────────────┬────────────────────────────────────────────┤
│           WEST             │                  CORE                      │
│  ┌──────────────────────┐  │  ┌──────────────────────────────────────┐  │
│  │ [L2] 정적 타입의 필요성│  │  │ 🎯 TypeScript 제네릭                  │  │
│  │ "런타임 오류 방지..."  │  │  │                                      │  │
│  └──────────────────────┘  │  │  [Topic Node]                         │  │
│  ┌──────────────────────┐  │  └──────────────────────────────────────┘  │
│  │ [L0] 타입 = 라벨     │  │                                           │
│  │ "📦 상자에 내용물    │  │                                           │
│  │  표시하는 것처럼..."  │  │                                           │
│  └──────────────────────┘  │                                           │
├────────────────────────────┼────────────────────────────────────────────┤
│        SOUTH_WEST          │                 SOUTH                      │
│  ┌──────────────────────┐  │  ┌──────────────────────────────────────┐  │
│  │ [L2] any를 쓰면 안돼?│  │  │ [L3] 정의                              │  │
│  │ "타입 안전성 상실..." │  │  │ "타입을 파라미터화하여 재사용성 확보"   │  │
│  └──────────────────────┘  │  └──────────────────────────────────────┘  │
│                            │  ┌──────────────────────────────────────┐  │
│                            │  │ [L1] 왜 필요할까?                     │  │
│                            │  │ "숫자/문자열마다 함수를 따로 만들면?"  │  │
│                            │  └──────────────────────────────────────┘  │
│                            │  ┌──────────────────────────────────────┐  │
│                            │  │ [L0] 마법 상자 비유                   │  │
│                            │  │ "📦 뭘 넣느냐에 따라 달라지는 상자"   │  │
│                            │  └──────────────────────────────────────┘  │
├────────────────────────────┴────────────────────────────────────────────┤
│                            SOUTH_EAST                                   │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐    │
│  │ [L2] 기본 예제                │  │ [L0] 레고 블록 비유           │    │
│  │ function identity<T>...      │  │ "🧱 어떤 색 블록이든 끼우는   │    │
│  └──────────────────────────────┘  │  범용 연결고리"               │    │
│  ┌──────────────────────────────┐  └──────────────────────────────┘    │
│  │ [L3] 타입 추론 예제           │                                      │
│  │ "컴파일러의 unification..."   │                                      │
│  └──────────────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Level 전환 예시

```typescript
// 같은 개념의 4가지 Level 표현

// [L3] FORMAL
await canvas_add_node({
  canvasPath: 'generics.canvas',
  anchorId: topicId,
  relation: 'answers',
  type: 'text',
  level: 'formal',
  content: `## 정의 [L3]
제네릭(Generics)은 타입을 파라미터로 받아
타입 수준의 추상화를 제공하는 다형성(Polymorphism) 구현 기법이다.
\`<T>\`를 통해 호출 시점에 구체 타입이 결정된다.`
});

// [L2] STANDARD
await canvas_add_node({
  canvasPath: 'generics.canvas',
  anchorId: formalNodeId,
  relation: 'simplifies',  // L3 → L2
  type: 'text',
  level: 'standard',
  content: `## 제네릭 사용법 [L2]
제네릭을 사용하면 함수나 클래스를 정의할 때
구체적인 타입을 지정하지 않고, 호출할 때 전달할 수 있습니다.

\`\`\`typescript
function identity<T>(arg: T): T {
  return arg;
}
identity<string>('hello');  // 타입: string
\`\`\``
});

// [L1] BRIDGING
await canvas_add_node({
  canvasPath: 'generics.canvas',
  anchorId: standardNodeId,
  relation: 'simplifies',
  type: 'text',
  level: 'bridging',
  content: `## 왜 제네릭이 필요할까? [L1]
만약 숫자 배열의 첫 번째 요소를 반환하는 함수와,
문자열 배열의 첫 번째 요소를 반환하는 함수를
따로따로 만들어야 한다면...?

이 반복을 없앨 방법이 있을까요? 🤔`
});

// [L0] INTUITIVE
await canvas_add_node({
  canvasPath: 'generics.canvas',
  anchorId: bridgingNodeId,
  relation: 'simplifies',
  type: 'text',
  level: 'intuitive',
  content: `## 마법 상자 📦 [L0]

빈 상자에 라벨만 붙여두는 거야.

\`\`\`
[    T    ] ← 아직 뭐가 들어갈지 몰라!
     ↓
[  사과   ] ← 사과 넣으면 사과 상자
[  블록   ] ← 블록 넣으면 블록 상자
\`\`\`

상자 모양은 같은데, 넣는 것에 따라 달라지는 마법!`
});
```

---

## 9. 검증 메트릭

### 9.1 성공 지표

| 지표 | 측정 방법 | 목표 |
|------|----------|------|
| Level 커버리지 | 핵심 개념당 평균 Level 수 | ≥ 3 |
| Level 정확도 | 추론 vs 명시 일치율 | ≥ 80% |
| 학습 경로 완성도 | L0→L3 연결된 개념 비율 | ≥ 70% |
| 사용자 만족도 | 적절한 Level 찾은 비율 | ≥ 85% |

### 9.2 품질 체크리스트

```markdown
□ 모든 핵심 개념에 L3(원론적) 노드 존재
□ L0(직관적) 노드에 비유/시각적 표현 포함
□ L1(연결) 노드가 L0↔L2 간격을 메움
□ Level 간 simplifies/formalizes 관계 연결
□ 전문용어는 L2 이상에서만 사용
□ L0 노드는 12살도 이해 가능한 언어 사용
```

---

## 10. 향후 확장

### 10.1 개인화 Level 추천

```typescript
// 사용자 프로필 기반 Level 추천
interface UserProfile {
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredLevels: AbstractionLevel[];
  readHistory: { nodeId: string; level: AbstractionLevel; duration: number }[];
}

function recommendLevel(profile: UserProfile, concept: string): AbstractionLevel {
  // 과거 읽기 패턴 분석
  // 체류 시간 기반 이해도 추정
  // 최적 Level 추천
}
```

### 10.2 Level 자동 생성

```typescript
// AI를 활용한 다른 Level 버전 자동 생성
async function generateLevelVariant(
  originalNode: CanvasNode,
  targetLevel: AbstractionLevel
): Promise<string> {
  const prompt = `
    다음 내용을 ${LEVEL_SPECS[targetLevel].label} 수준으로 변환하세요.
    대상 독자: ${LEVEL_SPECS[targetLevel].targetAudience}

    원본:
    ${originalNode.text}
  `;
  // AI 호출하여 변환
}
```

---

## 부록 A: Level 작성 치트시트

### FORMAL (L3) 빠른 가이드

```
✅ 사용:
- "~은/는 ~이다" 정의 형식
- 전문 용어 (괄호 안 영문)
- 수식, 공식, 형식적 표기
- 1-2문장 압축

❌ 피할 것:
- 비유, 예시
- 일상 언어
- 장황한 설명
```

### STANDARD (L2) 빠른 가이드

```
✅ 사용:
- 동작 원리 설명
- 단계별 구조
- 간단한 코드 예제
- 3-5문장

❌ 피할 것:
- "~란 ~이다" 정의 반복
- 과도한 전문용어
- 비유에 의존
```

### BRIDGING (L1) 빠른 가이드

```
✅ 사용:
- 질문으로 시작 ("왜?", "어떻게?")
- 문제 상황 제시
- "~하면 어떨까요?" 형태
- 동기 부여

❌ 피할 것:
- 직접적 답변
- 상세한 설명
- 코드 예제
```

### INTUITIVE (L0) 빠른 가이드

```
✅ 사용:
- 비유/메타포 ("~처럼", "~같은")
- 이모지, ASCII art
- 일상 사물 비교
- 스토리텔링

❌ 피할 것:
- 전문 용어
- 코드 블록
- 형식적 정의
```

---

## 부록 B: 참고 문헌

1. Sweller, J. (1988). Cognitive load during problem solving
2. Kalyuga, S. (2007). Expertise reversal effect
3. Vygotsky, L. S. (1978). Mind in society: Zone of Proximal Development
4. Paivio, A. (1986). Mental representations: A dual coding approach
5. Mayer, R. E. (2009). Multimedia learning
6. Clark, R. C. (2011). Building expertise: Cognitive methods for training

---

*문서 버전: 1.0*
*작성일: 2025-01-30*
*대상 버전: canvas-knowledge-mcp v2.2.0*
