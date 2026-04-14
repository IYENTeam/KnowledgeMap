# Canvas Knowledge Editor

논문 PDF를 업로드하면 Claude가 동심원 지식 그래프로 분해해주는 웹 에디터.
100% 브라우저에서 실행 — 서버 없음, DB 없음, API 키는 로컬에 암호화 저장.

---

## 🚀 AI 에이전트에게 시키는 방법 (사용자용)

비개발자가 Claude Code / Codex / Cursor 등에게 아래 내용을 붙여넣으면 됩니다:

```
이 레포를 클론하고 웹 앱을 실행해줘: <REPO_URL>

절차:
1. 이 레포를 clone
2. cd <repo>/web
3. npm install
4. npm run dev
5. 브라우저에서 http://localhost:5173 열기

설치 중 문제 생기면 해결해줘.
내가 할 일은 아무것도 없고, 끝나면 알려줘.
```

끝. AI 에이전트가 알아서 Node.js 버전 확인, 의존성 설치, dev 서버 실행까지 수행합니다.

사용자는 로컬 `http://localhost:5173` 에서 바로 사용 가능.

---

## 💡 사용법

1. 첫 실행 시 **Anthropic API 키** 요구 (사용자 본인 키 사용):
   - https://console.anthropic.com/settings/keys 에서 발급
   - 앱에서 비밀번호로 암호화하여 로컬에만 저장 (서버 전송 X)

2. **논문 PDF 드래그앤드롭** → Claude가 자동 분해

3. 노드 우클릭 → **"✨ AI로 확장"** 으로 특정 가지를 더 깊이 탐구

4. **Ctrl+S** 로 저장 · **Export** 로 HTML/JSON 내보내기

---

## 🔧 Requirements

- **Node.js 18+** (20 권장)
- **npm** 또는 pnpm / yarn
- Chrome / Edge / Safari / Firefox (File System 저장 기능은 Chromium 계열에서만)

## 📦 설치 & 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (권장: 일반 사용)
npm run dev
# → http://localhost:5173

# 프로덕션 빌드
npm run build

# 빌드 결과 로컬 프리뷰
npm run preview
```

다른 기기에서도 접근 가능하게 하려면:
```bash
npm run dev -- --host 0.0.0.0
```

## 🔑 환경 변수

**없음.** Claude API 키는 사용자가 UI 에서 직접 입력.
서버 배포해도 별도 env 설정 불필요.

## 🌐 호스팅 배포 (선택)

로컬 실행 대신 URL로 공유하고 싶으면:
- **Vercel**: `vercel.json` 설정 포함되어 있음 → Root Directory 를 `web` 로 지정하면 끝
- **Netlify / Cloudflare Pages**: 빌드 명령 `npm run build`, 출력 `dist`
- **GitHub Pages**: `vite.config.ts` 에 `base: '/<repo-name>/'` 추가 필요

## 🔒 보안 모델

| 항목 | 처리 방식 |
|------|----------|
| API 키 | PBKDF2(210K iter) + AES-256-GCM, 사용자 비밀번호로 암호화 후 localStorage |
| PDF 내용 | 클라이언트에서 pdfjs로 추출 → Anthropic 직접 호출 (중간 서버 없음) |
| 생성된 캔버스 | 사용자 로컬 파일 또는 수동 다운로드 |
| Claude API 호출 | `anthropic-dangerous-direct-browser-access` 헤더로 브라우저에서 직접 |

## 🎨 주요 기능

- **PDF 기반 3-depth 자동 분해**: 핵심 질문 (3-5개) → 답변 → 상세 설명
- **동심원 레이아웃**: 중앙 = 주제, 바깥으로 갈수록 구체화
- **충돌 없음 보장**: 노드 겹침 자동 해결 (결정론적)
- **동적 심화 확장**: "✨ Expand with AI" / "깊이 확장" 버튼
- **프롬프트 캐싱**: PDF 원문 → Claude 캐시로 저장, 병렬 호출 비용 절감
- **원본 근거 보장**: 모든 생성 콘텐츠가 원본 소스 참조
- **한/영 전환**: UI + AI 출력 모두
- **다크/라이트 테마 + 폰트 크기 조절**
- **되돌리기/다시실행/복사/붙여넣기/노드 리사이즈/드래그**
- **Zod 스키마 검증 + auto-fix** 미들웨어
- **Export**: `.canvas` JSON (Obsidian 호환) / Self-contained HTML

## 📁 프로젝트 구조

```
web/
├── public/canvases/          # 예제 .canvas 파일
├── src/
│   ├── App.tsx               # 앱 쉘 + 모달 오케스트레이션
│   ├── components/           # UI 컴포넌트
│   │   ├── CanvasViewer.tsx
│   │   ├── DecomposeDialog.tsx
│   │   ├── nodes/ edges/     # 커스텀 노드 & 엣지
│   │   └── ...
│   ├── hooks/                # useApiKey, useCanvasData, useTheme, ...
│   ├── lib/                  # staged-decompose, claude-api, pdf-extract, encryption, i18n, ...
│   └── styles/index.css
├── vite.config.ts
├── vercel.json
└── README.md (이 파일)
```

상위 레포에 TypeScript 타입 공유 (MCP 서버와 공유):
- `../src/types/` — Canvas / Semantic 타입
- Vite path alias 로 import

## 🐛 문제 해결

### `npm install` 실패 (권한 오류)
```bash
npm install --cache /tmp/npm-cache
```

### 포트 5173 사용 중
```bash
npm run dev -- --port 3000
```

### Claude API 401 오류
설정에서 API 키 재확인. `sk-ant-` 로 시작해야 함.

### PDF 파싱 실패
스캔된 이미지 PDF는 텍스트 추출 불가. OCR 처리된 PDF 필요.

### 큰 PDF (150K+ 글자)
자동으로 앞 70% + 뒤 25% 만 사용 (중간 생략). Claude 컨텍스트 제약.

## 🔗 Tech Stack

- **Vite** + **React 18** + **TypeScript**
- **@xyflow/react** v12 — 노드 그래프
- **pdfjs-dist** — PDF 텍스트 추출
- **zod** — 런타임 검증
- **Tailwind CSS** v4
- **react-markdown** — 노드 내 마크다운
- **Web Crypto API** — 키 암호화

## License

MIT (또는 사용자가 지정)
