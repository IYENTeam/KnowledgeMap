/**
 * Simple i18n: Korean (default) and English.
 */

import { useEffect, useState, useCallback } from 'react'

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'canvas-locale'

// Cast strings loose — we use the ko dict as the source of truth for keys.
type Dict = Record<string, string>

const ko: Dict = {
  // Header
  'app.title': 'Canvas',
  'app.subtitle': '지식 지도',
  'header.decompose': '지도 만들기',
  'header.decompose.tooltip.unlocked': 'PDF를 업로드해서 지식 지도 만들기',
  'header.decompose.tooltip.locked': '먼저 API 키를 열어주세요',
  'header.decompose.tooltip.nokey': '먼저 API 키를 등록해주세요',
  'header.theme.dark': '밝은 테마로',
  'header.theme.light': '어두운 테마로',
  'header.settings': '설정',
  'header.close': '닫기',
  'header.new': '새로 만들기',
  'header.example': '예시 보기',

  // Welcome (empty state)
  'welcome.title': '어서오세요',
  'welcome.subtitle': '논문을 올리면 AI가 동심원 지식 지도로 풀어드려요',
  'welcome.button.decompose.unlocked': 'PDF 올려서 시작하기',
  'welcome.button.decompose.locked': 'API 키 열고 시작하기',
  'welcome.button.decompose.nokey': 'API 키 등록하고 시작하기',
  'welcome.divider': '또는 기존 파일 열기',
  'welcome.blank': '빈 화면에서 시작',
  'welcome.example': '예시 먼저 보기',

  // Welcome modal (first time)
  'welcome.modal.title': 'Canvas에 오신 걸 환영해요',
  'welcome.modal.subtitle': '논문을 올리면 AI가 핵심 질문부터 뽑아서 한 장의 지도로 그려드려요.',
  'welcome.modal.feature1.title': 'AI가 논문을 풀어드려요',
  'welcome.modal.feature1.desc': 'Claude가 핵심 질문을 뽑고, 바깥으로 갈수록 점점 쉬운 설명이 붙어요',
  'welcome.modal.feature2.title': '바로 편집도 돼요',
  'welcome.modal.feature2.desc': '드래그, 편집, 연결 — AI 없이도 캔버스 기능은 전부 쓸 수 있어요',
  'welcome.modal.feature3.title': 'API 키는 내 컴퓨터에만',
  'welcome.modal.feature3.desc': '직접 정한 비밀번호로 암호화돼서 브라우저에만 저장돼요. 서버로 전송되지 않아요.',
  'welcome.modal.connect': 'API 키 등록하고 시작',
  'welcome.modal.skip': '일단 둘러볼게요',
  'welcome.modal.foot': 'API 키 없이도 편집기는 그대로 쓸 수 있어요. AI 기능만 키가 필요해요.',

  // Connect step
  'connect.title': 'API 키 등록',
  'connect.step1': '키는 여기서 발급받아요 → ',
  'connect.step1.link': 'console.anthropic.com/settings/keys',
  'connect.step2': '받은 키를 붙여넣고, 암호화할 비밀번호를 정해주세요.',
  'connect.label.key': 'Anthropic API 키',
  'connect.label.password': '비밀번호',
  'connect.label.password.hint': '(키를 암호화해서 보관)',
  'connect.label.confirm': '비밀번호 확인',
  'connect.placeholder.password': '새 비밀번호',
  'connect.placeholder.confirm': '한 번 더 입력',
  'connect.info': '키는 AES-256-GCM으로 암호화돼서 브라우저에만 저장돼요. 비밀번호를 잊으면 다시 키를 받아 등록해야 해요.',
  'connect.save': '저장하고 연결',
  'connect.saving': '암호화 중...',
  'connect.error.format': '키 형식이 맞지 않아요. "sk-ant-"로 시작해야 해요.',
  'connect.error.short': '비밀번호는 최소 4자 이상이어야 해요.',
  'connect.error.mismatch': '비밀번호가 서로 달라요.',
  'connect.error.rejected': 'Anthropic에서 키를 거부했어요. 다시 확인해주세요.',

  // Unlock
  'unlock.title': '키 열기',
  'unlock.subtitle': '비밀번호를 입력하면 저장된 키가 열려요.',
  'unlock.placeholder': '비밀번호',
  'unlock.button': '열기',
  'unlock.working': '여는 중...',
  'unlock.skip': '건너뛰기',
  'unlock.forgot': '비밀번호를 잊었어요 · 저장된 키 지우기',
  'unlock.forgot.confirm': '비밀번호를 잊었나요?\n\n이대로 지우면 다음에 API 키를 다시 등록해야 해요. 계속할까요?',

  // Settings
  'settings.title': '설정',
  'settings.label.key': 'Anthropic API 키',
  'settings.status.unlocked': '열림',
  'settings.status.locked': '잠김',
  'settings.status.nokey': '없음',
  'settings.nokey.desc': '아직 등록된 키가 없어요.',
  'settings.nokey.button': 'API 키 등록',
  'settings.locked.desc': '저장된 키가 있어요. 쓰려면 비밀번호로 열어주세요.',
  'settings.locked.unlock': '열기',
  'settings.locked.remove': '지우기',
  'settings.unlocked.lock': '잠그기',
  'settings.unlocked.changepw': '비밀번호 바꾸기',
  'settings.unlocked.replace': '다른 키로 바꾸기',
  'settings.unlocked.remove': '지우기',
  'settings.pw.current': '지금 비밀번호',
  'settings.pw.new': '새 비밀번호',
  'settings.pw.confirm': '새 비밀번호 확인',
  'settings.pw.save': '저장',
  'settings.pw.saving': '다시 암호화 중...',
  'settings.pw.cancel': '취소',
  'settings.pw.error.short': '새 비밀번호는 최소 4자 이상이어야 해요.',
  'settings.pw.error.mismatch': '새 비밀번호가 서로 달라요.',
  'settings.howstored.title': '🔐 어떻게 저장되나요?',
  'settings.howstored.desc': '비밀번호로 만든 키(PBKDF2, 210,000회)로 AES-256-GCM 암호화해서 브라우저에만 저장해요. 잠금을 풀어도 원래 키는 메모리에만 잠깐 있어요.',
  'settings.remove.confirm': '정말 지울까요?',

  // Decompose dialog
  'decompose.title': '논문 지도 만들기',
  'decompose.subtitle': '논문 PDF를 올리면 AI가 핵심 질문을 뽑고, 동심원 형태로 풀어드려요.',
  'decompose.drop.title': '여기에 PDF를 놓으세요',
  'decompose.drop.browse': '또는 클릭해서 고르기',
  'decompose.reading': 'PDF 읽는 중',
  'decompose.page': '페이지',
  'decompose.pages': '쪽',
  'decompose.chars.extracted': '글자',
  'decompose.truncated.warn': '⚠️ 논문이 너무 길어서 중간 부분은 잘렸어요. 서론과 결론은 그대로 쓰여요.',
  'decompose.truncated.from': '원본',
  'decompose.preview': '추출된 텍스트 보기',
  'decompose.truncated.more': '... (뒷부분 생략)',
  'decompose.generate': '지도 만들기',
  'decompose.generating': '만드는 중...',
  'decompose.cancel': '중단',
  'decompose.close': '닫기',
  'decompose.error.notpdf': 'PDF 파일만 올릴 수 있어요.',
  'decompose.error.scanned': '텍스트를 뽑을 수 없어요. 스캔된 이미지 PDF인 것 같아요.',
  'decompose.error.parse': 'PDF를 읽지 못했어요',
  'decompose.error.validation': '결과 형식이 맞지 않아요',

  // Progress stages
  'progress.extracting': '핵심 질문 뽑는 중',
  'progress.extracting.desc': '이 논문이 답하는 질문들을 찾고 있어요',
  'progress.answers': '답변 쓰는 중',
  'progress.answers.desc': '질문마다 동시에 쓰고 있어요',
  'progress.answers.count': '개 질문',
  'progress.details': '한 층 더 풀어쓰는 중',
  'progress.details.desc': '각 답변을 쉬운 버전으로도 다시 써요',
  'progress.details.count': '개 답변',
  'progress.finalizing': '지도 마무리',
  'progress.finalizing.desc': '동심원 배치로 정리하는 중',
  'progress.autofixed': '자동으로 수정함',
  'progress.autofixed.more': '개 (클릭해서 보기)',
  'progress.autofixed.and': '개 더',

  // Canvas viewer
  'viewer.shortcuts.hint': '단축키 보기',
  'viewer.press': '누르면',
  'viewer.expand.working': 'AI가 이 노드를 한 층 더 쉽게 풀어쓰는 중...',
  'viewer.expand.failed': '확장 실패',

  // Toolbar
  'toolbar.add': '노드 추가',
  'toolbar.add.hint': '빈 곳 더블클릭으로도 돼요',
  'toolbar.export': '내보내기',
  'toolbar.export.json.title': '.canvas 파일로',
  'toolbar.export.json.desc': '다시 열 수도 있고 Obsidian에서도 써요',
  'toolbar.export.html.title': 'HTML 파일로',
  'toolbar.export.html.desc': '카톡/메일로 보내도 그대로 보여요',

  // Context menu
  'ctx.edit': '편집',
  'ctx.edit.shortcut': '더블클릭',
  'ctx.expand': '✨ 한 층 더 쉽게 풀어줘',
  'ctx.duplicate': '복사본 만들기',
  'ctx.copy': '복사',
  'ctx.color': '색',
  'ctx.delete': '삭제',
  'ctx.delete.edge': '연결선 삭제',
  'ctx.add.text': '여기에 노드 추가',
  'ctx.paste': '붙여넣기',
  'ctx.fitview': '화면에 맞추기',

  // Sidebar
  'sidebar.edit': '편집',
  'sidebar.delete': '노드 삭제',
  'sidebar.color': '색',
  'sidebar.id': 'ID',
  'sidebar.position': '위치',
  'sidebar.size': '크기',
  'sidebar.editor.done': '완료',
  'sidebar.link.open': '새 탭으로 열기',

  // Edge editor
  'edge.title': '연결선',
  'edge.label': '이름',
  'edge.label.placeholder': '이름 (선택)',
  'edge.color': '색',
  'edge.from': '시작',
  'edge.to': '끝',
  'edge.handle': '접점',
  'edge.delete': '연결선 삭제',

  // Shortcuts help
  'shortcuts.title': '키보드 단축키',
  'shortcuts.section.general': '기본',
  'shortcuts.section.canvas': '캔버스',
  'shortcuts.section.markdown': '글 편집',
  'shortcuts.undo': '되돌리기',
  'shortcuts.redo': '다시 실행',
  'shortcuts.copy': '선택한 것 복사',
  'shortcuts.paste': '붙여넣기',
  'shortcuts.duplicate': '복사본 만들기',
  'shortcuts.export': '내보내기',
  'shortcuts.delete': '선택한 것 삭제',
  'shortcuts.toggle': '단축키 도움말 열기/닫기',
  'shortcuts.dblclick.empty': '빈 곳 더블클릭',
  'shortcuts.dblclick.empty.action': '새 노드 만들기',
  'shortcuts.dblclick.node': '노드 더블클릭',
  'shortcuts.dblclick.node.action': '내용 편집',
  'shortcuts.rightclick': '우클릭',
  'shortcuts.rightclick.action': '메뉴 열기',
  'shortcuts.edge.click': '연결선 클릭',
  'shortcuts.edge.click.action': '이름·색 편집',
  'shortcuts.edge.create': '접점에서 드래그',
  'shortcuts.edge.create.action': '연결선 만들기',
  'shortcuts.scroll': '스크롤',
  'shortcuts.scroll.action': '확대 / 축소',
  'shortcuts.esc': '선택 해제 / 닫기',
  'shortcuts.bold': '굵게',
  'shortcuts.italic': '기울임',
  'shortcuts.inlinecode': '코드 스타일',
  'shortcuts.finish': '편집 끝',

  // File upload / JSON paste
  'upload.drop': '.canvas 또는 .json 파일을 여기에',
  'upload.browse': '또는 클릭해서 고르기',
  'jsonpaste.trigger': 'JSON 직접 붙여넣기',
  'jsonpaste.load': '열기',
  'jsonpaste.cancel': '취소',
}

const en: Dict = {
  'app.title': 'Canvas',
  'app.subtitle': 'Knowledge Editor',
  'header.decompose': 'Decompose',
  'header.decompose.tooltip.unlocked': 'Decompose a paper PDF with AI',
  'header.decompose.tooltip.locked': 'Unlock your API key first',
  'header.decompose.tooltip.nokey': 'Connect API key first',
  'header.theme.dark': 'Switch to light mode',
  'header.theme.light': 'Switch to dark mode',
  'header.settings': 'Settings',
  'header.close': 'Close',
  'header.new': 'New',
  'header.example': 'Example',

  'welcome.title': 'Open a Canvas',
  'welcome.subtitle': 'Decompose a paper into a radial knowledge graph',
  'welcome.button.decompose.unlocked': 'Decompose a paper PDF',
  'welcome.button.decompose.locked': 'Unlock key to decompose',
  'welcome.button.decompose.nokey': 'Connect API key to decompose',
  'welcome.divider': 'or open existing',
  'welcome.blank': 'Start blank',
  'welcome.example': 'Try the example',

  'welcome.modal.title': 'Welcome to Canvas Knowledge',
  'welcome.modal.subtitle': 'Upload a paper, get a radial knowledge graph — powered by Claude.',
  'welcome.modal.feature1.title': 'AI-powered paper decomposition',
  'welcome.modal.feature1.desc': 'Claude extracts core questions from a PDF and builds a visual map',
  'welcome.modal.feature2.title': 'Interactive editor',
  'welcome.modal.feature2.desc': 'Drag, edit, expand, connect — works without AI for basic use',
  'welcome.modal.feature3.title': 'Password-encrypted storage',
  'welcome.modal.feature3.desc': 'Your API key is encrypted with a password you choose. We never see it.',
  'welcome.modal.connect': 'Connect Claude API',
  'welcome.modal.skip': 'Skip for now',
  'welcome.modal.foot': 'You can use the editor and viewer without an API key. AI features require one.',

  'connect.title': 'Connect your API key',
  'connect.step1': 'Get your key at ',
  'connect.step1.link': 'console.anthropic.com/settings/keys',
  'connect.step2': 'Paste it below and choose a password to encrypt it locally.',
  'connect.label.key': 'Anthropic API Key',
  'connect.label.password': 'Password',
  'connect.label.password.hint': '(to encrypt your key)',
  'connect.label.confirm': 'Confirm Password',
  'connect.placeholder.password': 'Choose a password',
  'connect.placeholder.confirm': 'Re-enter password',
  'connect.info': 'Key is encrypted with your password using AES-256-GCM. If you forget the password, you\'ll need to re-enter your API key.',
  'connect.save': 'Save & Connect',
  'connect.saving': 'Encrypting & saving...',
  'connect.error.format': 'Key should start with "sk-ant-" and be at least 20 characters.',
  'connect.error.short': 'Password must be at least 4 characters.',
  'connect.error.mismatch': 'Passwords do not match.',
  'connect.error.rejected': 'Key was rejected by Anthropic. Please check and try again.',

  'unlock.title': 'Unlock API Key',
  'unlock.subtitle': 'Enter your password to decrypt.',
  'unlock.placeholder': 'Password',
  'unlock.button': 'Unlock',
  'unlock.working': 'Decrypting...',
  'unlock.skip': 'Skip',
  'unlock.forgot': 'Forgot password? · Remove encrypted key',
  'unlock.forgot.confirm': 'Forgot password? You\'ll need to re-enter your API key.\n\nRemove the encrypted key?',

  'settings.title': 'Settings',
  'settings.label.key': 'Anthropic API Key',
  'settings.status.unlocked': 'Unlocked',
  'settings.status.locked': 'Locked',
  'settings.status.nokey': 'Not set',
  'settings.nokey.desc': 'No key stored.',
  'settings.nokey.button': 'Connect API Key',
  'settings.locked.desc': 'Encrypted key is stored. Unlock to use AI features.',
  'settings.locked.unlock': 'Unlock',
  'settings.locked.remove': 'Remove',
  'settings.unlocked.lock': 'Lock',
  'settings.unlocked.changepw': 'Change password',
  'settings.unlocked.replace': 'Replace key',
  'settings.unlocked.remove': 'Remove',
  'settings.pw.current': 'Current password',
  'settings.pw.new': 'New password',
  'settings.pw.confirm': 'Confirm new password',
  'settings.pw.save': 'Save',
  'settings.pw.saving': 'Re-encrypting...',
  'settings.pw.cancel': 'Cancel',
  'settings.pw.error.short': 'New password must be at least 4 characters.',
  'settings.pw.error.mismatch': 'New passwords do not match.',
  'settings.howstored.title': '🔐 How it\'s stored:',
  'settings.howstored.desc': 'Your key is encrypted with AES-256-GCM using a password-derived key (PBKDF2, 210,000 iterations). Encrypted blob in localStorage — the decrypted key only lives in memory after unlock.',
  'settings.remove.confirm': 'Remove encrypted key?',

  'decompose.title': 'Decompose a Paper',
  'decompose.subtitle': 'Upload a paper PDF. Claude will extract core questions and build a radial knowledge map grounded in the paper.',
  'decompose.drop.title': 'Drop a paper PDF here',
  'decompose.drop.browse': 'or click to browse',
  'decompose.reading': 'Reading PDF',
  'decompose.page': 'Page',
  'decompose.pages': 'pages',
  'decompose.chars.extracted': 'chars extracted',
  'decompose.truncated.warn': '⚠️ PDF is large. Middle sections will be omitted to fit Claude\'s context. Intro + conclusion are kept.',
  'decompose.truncated.from': 'truncated from',
  'decompose.preview': 'Preview extracted text',
  'decompose.truncated.more': '... (truncated)',
  'decompose.generate': 'Generate Canvas',
  'decompose.generating': 'Generating...',
  'decompose.cancel': 'Cancel',
  'decompose.close': 'Close',
  'decompose.error.notpdf': 'Please upload a PDF file.',
  'decompose.error.scanned': 'Could not extract any text from this PDF. It may be a scanned image.',
  'decompose.error.parse': 'Failed to parse PDF',
  'decompose.error.validation': 'Validation failed',

  'progress.extracting': 'Extracting core questions',
  'progress.extracting.desc': 'Finding the questions this paper answers',
  'progress.answers': 'Generating answers',
  'progress.answers.desc': 'For each question (parallel)',
  'progress.answers.count': 'questions',
  'progress.details': 'Adding details',
  'progress.details.desc': 'For each answer (parallel)',
  'progress.details.count': 'answers',
  'progress.finalizing': 'Composing canvas',
  'progress.finalizing.desc': 'Arranging in radial layout',
  'progress.autofixed': 'Auto-fixed',
  'progress.autofixed.more': 'issues (click to expand)',
  'progress.autofixed.and': 'more',

  'viewer.shortcuts.hint': 'for shortcuts',
  'viewer.press': 'Press',
  'viewer.expand.working': 'Claude is expanding this node from your source...',
  'viewer.expand.failed': 'Expand failed',

  'toolbar.add': 'Add Node',
  'toolbar.add.hint': 'dbl-click empty area to add',
  'toolbar.export': 'Export',
  'toolbar.export.json.title': 'As .canvas JSON',
  'toolbar.export.json.desc': 'Re-openable here or in Obsidian',
  'toolbar.export.html.title': 'As HTML (standalone)',
  'toolbar.export.html.desc': 'Works offline, sendable via email/Slack',

  'ctx.edit': 'Edit',
  'ctx.edit.shortcut': 'dbl-click',
  'ctx.expand': '✨ Explain one level simpler',
  'ctx.duplicate': 'Duplicate',
  'ctx.copy': 'Copy',
  'ctx.color': 'Color',
  'ctx.delete': 'Delete',
  'ctx.delete.edge': 'Delete Edge',
  'ctx.add.text': 'Add Text Node',
  'ctx.paste': 'Paste',
  'ctx.fitview': 'Fit View',

  'sidebar.edit': 'Edit',
  'sidebar.delete': 'Delete node',
  'sidebar.color': 'Color',
  'sidebar.id': 'ID',
  'sidebar.position': 'Position',
  'sidebar.size': 'Size',
  'sidebar.editor.done': 'Done',
  'sidebar.link.open': 'Open in new tab',

  'edge.title': 'Edge',
  'edge.label': 'Label',
  'edge.label.placeholder': 'Optional label',
  'edge.color': 'Color',
  'edge.from': 'From',
  'edge.to': 'To',
  'edge.handle': 'Handle',
  'edge.delete': 'Delete Edge',

  'shortcuts.title': 'Keyboard Shortcuts',
  'shortcuts.section.general': 'General',
  'shortcuts.section.canvas': 'Canvas',
  'shortcuts.section.markdown': 'Markdown Editor',
  'shortcuts.undo': 'Undo',
  'shortcuts.redo': 'Redo',
  'shortcuts.copy': 'Copy selected nodes',
  'shortcuts.paste': 'Paste nodes',
  'shortcuts.duplicate': 'Duplicate selected',
  'shortcuts.export': 'Export canvas',
  'shortcuts.delete': 'Delete selected',
  'shortcuts.toggle': 'Toggle shortcuts help',
  'shortcuts.dblclick.empty': 'Double-click (empty)',
  'shortcuts.dblclick.empty.action': 'Add new text node',
  'shortcuts.dblclick.node': 'Double-click (node)',
  'shortcuts.dblclick.node.action': 'Edit node text',
  'shortcuts.rightclick': 'Right-click',
  'shortcuts.rightclick.action': 'Context menu',
  'shortcuts.edge.click': 'Click edge',
  'shortcuts.edge.click.action': 'Edit edge label & color',
  'shortcuts.edge.create': 'Drag from handle',
  'shortcuts.edge.create.action': 'Create edge',
  'shortcuts.scroll': 'Scroll',
  'shortcuts.scroll.action': 'Zoom in/out',
  'shortcuts.esc': 'Deselect / Close editor',
  'shortcuts.bold': 'Bold',
  'shortcuts.italic': 'Italic',
  'shortcuts.inlinecode': 'Inline code',
  'shortcuts.finish': 'Finish editing',

  'upload.drop': 'Drop .canvas or .json file',
  'upload.browse': 'or click to browse',
  'jsonpaste.trigger': 'or paste JSON directly',
  'jsonpaste.load': 'Load',
  'jsonpaste.cancel': 'Cancel',
}

const dicts: Record<Locale, Dict> = { ko, en }

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ko'
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
  if (stored === 'ko' || stored === 'en') return stored
  // Default: Korean unless the browser is clearly non-Korean
  const lang = (navigator.language || '').toLowerCase()
  return lang.startsWith('ko') || !lang.startsWith('en') ? 'ko' : 'en'
}

let currentLocale: Locale = getInitialLocale()

const listeners = new Set<(l: Locale) => void>()

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(l: Locale): void {
  currentLocale = l
  localStorage.setItem(STORAGE_KEY, l)
  listeners.forEach((fn) => fn(l))
}

export function t(key: string, ...args: (string | number)[]): string {
  const dict = dicts[currentLocale]
  const fallback = dicts.ko
  const raw = (dict[key] ?? fallback[key] ?? key) as string
  if (args.length === 0) return raw
  return args.reduce<string>((s, v, i) => s.replace(`{${i}}`, String(v)), raw)
}

/**
 * React hook — returns a `t` function tied to current locale, re-renders on locale change.
 */
export function useT() {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const onChange = () => forceRender((n) => n + 1)
    listeners.add(onChange)
    return () => {
      listeners.delete(onChange)
    }
  }, [])

  const tt = useCallback((key: string, ...args: (string | number)[]) => t(key, ...args), [])
  return { t: tt, locale: currentLocale, setLocale }
}
