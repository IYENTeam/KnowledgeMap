# KnowledgeMap

**논문 PDF 한 장 올리면, 그 논문이 답하는 핵심 질문 → 답변 → 더 쉬운 설명이 동심원으로 그려집니다.**

중앙에는 논문의 핵심 질문이 놓이고, 바깥으로 갈수록 같은 내용을 **더 쉬운 말로 풀어쓴** 레이어가 나옵니다. 새로운 내용이 추가되는 게 아니라 안쪽 설명의 용어가 한 층씩 풀어지는 구조라, 논문을 처음 보는 사람도 안에서 바깥으로 읽어나가면서 이해의 깊이를 조절할 수 있어요.

https://github.com/IYENTeam/KnowledgeMap

---

## 설치해서 쓰는 법 (비개발자용)

Claude Code / Codex / Cursor 같은 AI 코딩 도구를 쓰면 설치가 한 번에 끝납니다.
AI 에게 아래 문장을 그대로 붙여넣으세요:

```
이 레포를 내 컴퓨터에 설치하고 웹 서버 실행해줘:
https://github.com/IYENTeam/KnowledgeMap

1. git clone
2. cd KnowledgeMap/web
3. npm install
4. npm run dev

성공하면 http://localhost:5173 을 브라우저에서 열면 돼.
오류 나면 알아서 해결해줘.
```

그럼 AI가 Node.js 설치 확인, 의존성 설치, 개발 서버 실행까지 해줍니다.
브라우저에서 `http://localhost:5173` 열면 끝.

---

## 처음 쓸 때

1. 첫 화면에서 **Anthropic API 키** 를 등록합니다.
   - [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) 에서 받을 수 있어요.
   - 요금: 논문 한 개당 대략 ¢10~¢30 (모델 요금 기준, 본인 앞으로 과금).
2. 직접 정한 비밀번호로 키를 암호화해서 브라우저에만 저장합니다. 서버로 전송되지 않아요.
3. 논문 PDF 파일을 드래그앤드롭.
4. 질문이 먼저 뜨고, 답변이 채워지고, 바깥쪽 설명이 순서대로 스트리밍돼요.

---

## 핵심 아이디어

- **중앙 = 논문의 핵심 질문들** (3~5개)
- **중간 링 = 각 질문에 대한 답변** (논문 용어 그대로)
- **바깥쪽 링 = 같은 답변을 더 쉬운 말로 풀어쓴 버전**
- 더 쉽게 보고 싶으면 노드 우클릭 → **"한 층 더 쉽게 풀어줘"** 로 한 단계씩 풀 수 있어요.
- 설명의 원본은 중간 링(답변)에 있고, 바깥은 **같은 내용을 쉬운 말로 재표현** 한 것뿐이에요. 새로운 주제가 갑자기 튀어나오지 않습니다.

---

## 뭐가 돼요?

- PDF 한 개 → 지식 지도 한 장 (AI 자동 생성)
- 노드 드래그 / 크기 조절 / 색 바꾸기 / 연결 선 긋기
- 되돌리기, 복사/붙여넣기, 단축키
- `.canvas` 파일로 저장 (Obsidian Canvas 호환)
- HTML 파일로 내보내기 (메일·카톡으로 공유해도 그대로 열림)
- 한국어 / 영어 UI, 어두운 / 밝은 테마, 글자 크기 조절

---

## 기술적인 부분 (개발자용)

### 실행

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # 프로덕션 빌드
```

### 구조

- **프론트엔드 전용** - 서버, DB, 인증 시스템 없음
- Claude API 를 브라우저에서 직접 호출 (`anthropic-dangerous-direct-browser-access`)
- PDF 파싱도 브라우저 (pdfjs-dist)
- API 키는 **PBKDF2 + AES-256-GCM** 으로 비밀번호 암호화해서 `localStorage`에 저장

### 쓰는 것

- Vite + React 18 + TypeScript
- [@xyflow/react](https://reactflow.dev) — 노드 그래프
- pdfjs-dist — PDF 텍스트 추출
- Tailwind CSS v4
- zod — 런타임 스키마 검증
- Web Crypto API — 키 암호화

### 동작 원리

```
PDF → 텍스트 추출 (pdfjs, 브라우저 내)
   ↓
Claude 1단계: 핵심 질문 3-5개 뽑기     → 토픽 + 질문 노드 즉시 렌더
   ↓
Claude 2단계 (병렬): 질문별 답변 생성   → 완성되는 대로 스트리밍 추가
   ↓
Claude 3단계 (병렬): 답변별 쉬운 재표현 → 완성되는 대로 스트리밍 추가
```

- 원본 PDF 텍스트는 **프롬프트 캐시** (Anthropic ephemeral cache) 로 저장해서 반복 호출 비용 최소화
- Rate limit (429) 에 걸리면 자동 재시도 (최대 20회, 지수 백오프 2~64초)
- 동심원 배치는 각도 섹터 기반 트리 레이아웃 + AABB 충돌 회피로 겹치지 않도록 보장

### 문제 해결

| 증상 | 해결 |
|---|---|
| `npm install` 권한 오류 | `npm install --cache /tmp/npm-cache` |
| 포트 5173 사용 중 | `npm run dev -- --port 3000` |
| API 키 401 | `sk-ant-` 로 시작하는지 확인 |
| PDF 텍스트 추출 실패 | 스캔 이미지 PDF 는 지원 안 됨 (OCR 된 PDF 필요) |
| 아주 긴 PDF | 자동으로 앞 70% + 뒤 25% 만 사용 (중간 생략) |

---

## 라이선스

MIT
