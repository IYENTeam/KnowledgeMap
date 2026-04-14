# KnowledgeMap

논문 PDF를 동심원 지식 지도로 풀어주는 웹 앱.

중앙에는 논문이 답하는 핵심 질문들이 놓이고, 바깥으로 갈수록 그 내용을 **더 쉬운 말로 풀어쓴** 레이어가 나옵니다. 새로운 내용이 추가되는 게 아니라 안쪽 설명의 용어가 한 층씩 풀어지는 구조라, 논문을 처음 보는 사람도 바깥에서 안쪽으로 읽으면서 이해의 깊이를 조절할 수 있어요.

## 빠른 시작

Claude Code / Codex / Cursor 같은 AI 코딩 도구에 아래를 붙여넣으세요:

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

수동 설치:

```bash
git clone https://github.com/IYENTeam/KnowledgeMap.git
cd KnowledgeMap/web
npm install
npm run dev
```

→ [web/README.md](./web/README.md) 에서 자세한 사용법 / 기술 구조 확인.

## 기본 흐름

1. [Anthropic API 키](https://console.anthropic.com/settings/keys) 등록 (본인 과금, 논문 하나당 약 ¢10~30)
2. 브라우저에서 비밀번호로 키 암호화 (서버 전송 X)
3. PDF 드래그앤드롭 → AI 가 동심원 지식 지도 생성
4. 노드 우클릭으로 더 쉬운 설명 단계적 확장 가능

## 라이선스

MIT
