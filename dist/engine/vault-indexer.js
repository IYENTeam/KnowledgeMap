/**
 * Vault Indexer
 *
 * 볼트 내 노트를 인덱싱하여 빠른 검색을 지원합니다.
 * 캔버스 생성/확장 시 관련 노트를 빠르게 찾을 수 있습니다.
 */
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, relative, extname, basename } from 'path';
// =============================================================================
// Configuration
// =============================================================================
const EXCLUDE_PATTERNS = [
    /^\./, // 숨김 폴더/파일
    /^node_modules\//,
    /^\.obsidian\//,
    /^\.claude\//,
    /\.canvas$/, // 캔버스 파일 제외
];
const INDEX_FILE = '.vault_index.json';
// =============================================================================
// Vault Indexer Class
// =============================================================================
export class VaultIndexer {
    vaultPath;
    indexPath;
    index = null;
    constructor(vaultPath = '.') {
        this.vaultPath = vaultPath;
        this.indexPath = join(vaultPath, INDEX_FILE);
    }
    // ===========================================================================
    // Index Building
    // ===========================================================================
    /**
     * 전체 볼트 인덱스 빌드
     */
    async buildIndex(force = false) {
        // 기존 인덱스 로드
        if (!force) {
            try {
                this.index = await this.loadIndex();
            }
            catch {
                this.index = this.createEmptyIndex();
            }
        }
        else {
            this.index = this.createEmptyIndex();
        }
        // 모든 .md 파일 스캔
        const mdFiles = await this.findMarkdownFiles(this.vaultPath);
        let updated = 0;
        let skipped = 0;
        for (const filePath of mdFiles) {
            const relativePath = relative(this.vaultPath, filePath);
            if (this.shouldExclude(relativePath))
                continue;
            // 변경 확인 (증분 업데이트)
            if (!force && this.index.notes[relativePath]) {
                const existing = this.index.notes[relativePath];
                const fileStat = await stat(filePath);
                if (existing.modifiedAt >= fileStat.mtimeMs) {
                    skipped++;
                    continue;
                }
            }
            // 인덱싱
            const metadata = await this.indexNote(filePath);
            if (metadata) {
                this.index.notes[relativePath] = metadata;
                updated++;
            }
        }
        // 삭제된 파일 제거
        const existingPaths = new Set(mdFiles.map((f) => relative(this.vaultPath, f)));
        for (const path of Object.keys(this.index.notes)) {
            if (!existingPaths.has(path)) {
                delete this.index.notes[path];
            }
        }
        // 역링크 계산
        this.buildBacklinks();
        // 태그/키워드 인덱스 빌드
        this.buildTagIndex();
        this.buildKeywordIndex();
        // 메타데이터 업데이트
        this.index.indexedAt = new Date().toISOString();
        // 저장
        await this.saveIndex();
        console.log(`Index built: ${updated} updated, ${skipped} skipped`);
        return this.index;
    }
    /**
     * 단일 노트 인덱싱
     */
    async indexNote(filePath) {
        try {
            const relativePath = relative(this.vaultPath, filePath);
            const content = await readFile(filePath, 'utf-8');
            const fileStat = await stat(filePath);
            return {
                path: relativePath,
                title: this.extractTitle(content, filePath),
                tags: this.extractTags(content),
                links: this.extractLinks(content),
                backlinks: [],
                keywords: this.extractKeywords(content, this.extractTitle(content, filePath)),
                createdAt: this.extractCreatedDate(content),
                modifiedAt: fileStat.mtimeMs,
                size: fileStat.size,
            };
        }
        catch (e) {
            console.warn(`Warning: Failed to index ${filePath}:`, e);
            return null;
        }
    }
    // ===========================================================================
    // Content Extraction
    // ===========================================================================
    extractTitle(content, filePath) {
        // # 헤딩 찾기
        const match = content.match(/^#\s+(.+)$/m);
        if (match)
            return match[1].trim();
        // 파일명 사용
        return basename(filePath, '.md');
    }
    extractTags(content) {
        const tags = new Set();
        // 프론트매터의 tags 필드
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
            const fmContent = frontmatterMatch[1];
            const tagsMatch = fmContent.match(/tags:\s*\[?([^\]\n]+)\]?/);
            if (tagsMatch) {
                const rawTags = tagsMatch[1];
                for (const tag of rawTags.split(/[,\s]+/)) {
                    const cleaned = tag.trim().replace(/^#/, '').replace(/["']/g, '');
                    if (cleaned)
                        tags.add(cleaned);
                }
            }
        }
        // 본문의 #태그
        const inlineTags = content.match(/(?<!\w)#([a-zA-Z가-힣][a-zA-Z0-9가-힣_/-]*)/g);
        if (inlineTags) {
            for (const tag of inlineTags) {
                tags.add(tag.slice(1)); // # 제거
            }
        }
        return Array.from(tags);
    }
    extractLinks(content) {
        // [[링크]] 또는 [[링크|표시텍스트]]
        const matches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
        if (!matches)
            return [];
        return [...new Set(matches.map((m) => m.replace(/\[\[([^\]|]+).*/, '$1')))];
    }
    extractKeywords(content, title) {
        const keywords = new Set();
        // 제목 단어
        for (const word of title.match(/[a-zA-Z가-힣]{2,}/g) || []) {
            keywords.add(word.toLowerCase());
        }
        // ## 헤딩들
        const headings = content.match(/^#{2,}\s+(.+)$/gm);
        if (headings) {
            for (const heading of headings) {
                for (const word of heading.match(/[a-zA-Z가-힣]{2,}/g) || []) {
                    keywords.add(word.toLowerCase());
                }
            }
        }
        // **볼드** 텍스트
        const bolds = content.match(/\*\*(.+?)\*\*/g);
        if (bolds) {
            for (const bold of bolds) {
                for (const word of bold.replace(/\*\*/g, '').match(/[a-zA-Z가-힣]{2,}/g) || []) {
                    keywords.add(word.toLowerCase());
                }
            }
        }
        // `코드` 텍스트 (짧은 것만)
        const codes = content.match(/`([^`]{2,30})`/g);
        if (codes) {
            for (const code of codes) {
                const cleaned = code.replace(/`/g, '');
                if (!cleaned.includes(' ')) {
                    keywords.add(cleaned.toLowerCase());
                }
            }
        }
        return Array.from(keywords);
    }
    extractCreatedDate(content) {
        const match = content.match(/Created:\s*(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : undefined;
    }
    // ===========================================================================
    // Index Building Helpers
    // ===========================================================================
    buildBacklinks() {
        if (!this.index)
            return;
        // 모든 역링크 초기화
        for (const note of Object.values(this.index.notes)) {
            note.backlinks = [];
        }
        // 링크 순회하며 역링크 추가
        for (const [path, note] of Object.entries(this.index.notes)) {
            for (const link of note.links) {
                const linkLower = link.toLowerCase();
                for (const [targetPath, targetNote] of Object.entries(this.index.notes)) {
                    const targetStem = basename(targetPath, '.md').toLowerCase();
                    if (targetStem === linkLower || targetPath.toLowerCase().endsWith(`/${linkLower}.md`)) {
                        if (!targetNote.backlinks.includes(path)) {
                            targetNote.backlinks.push(path);
                        }
                        break;
                    }
                }
            }
        }
    }
    buildTagIndex() {
        if (!this.index)
            return;
        this.index.tagIndex = {};
        for (const [path, note] of Object.entries(this.index.notes)) {
            for (const tag of note.tags) {
                if (!this.index.tagIndex[tag]) {
                    this.index.tagIndex[tag] = [];
                }
                this.index.tagIndex[tag].push(path);
            }
        }
    }
    buildKeywordIndex() {
        if (!this.index)
            return;
        this.index.keywordIndex = {};
        for (const [path, note] of Object.entries(this.index.notes)) {
            for (const keyword of note.keywords) {
                if (!this.index.keywordIndex[keyword]) {
                    this.index.keywordIndex[keyword] = [];
                }
                this.index.keywordIndex[keyword].push(path);
            }
        }
    }
    // ===========================================================================
    // Search API
    // ===========================================================================
    /**
     * 키워드로 노트 검색
     */
    async searchByKeyword(keyword, options = {}) {
        await this.ensureIndex();
        const limit = options.limit || 10;
        const keywordLower = keyword.toLowerCase();
        const results = [];
        // 키워드 인덱스에서 검색
        const keywordPaths = this.index.keywordIndex[keywordLower] || [];
        for (const path of keywordPaths.slice(0, limit)) {
            const note = this.index.notes[path];
            if (note) {
                results.push({ note, score: 2, matchedKeywords: [keyword] });
            }
        }
        // 제목에서 검색 (추가)
        if (results.length < limit) {
            for (const [path, note] of Object.entries(this.index.notes)) {
                if (results.find((r) => r.note.path === path))
                    continue;
                if (note.title.toLowerCase().includes(keywordLower)) {
                    results.push({ note, score: 3, matchedKeywords: [keyword] });
                    if (results.length >= limit)
                        break;
                }
            }
        }
        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }
    /**
     * 태그로 노트 검색
     */
    async searchByTag(tag, options = {}) {
        await this.ensureIndex();
        const limit = options.limit || 20;
        const tagClean = tag.replace(/^#/, '');
        const results = [];
        const tagPaths = this.index.tagIndex[tagClean] || [];
        for (const path of tagPaths.slice(0, limit)) {
            const note = this.index.notes[path];
            if (note) {
                results.push({ note, score: 1, matchedTags: [tag] });
            }
        }
        return results;
    }
    /**
     * 여러 키워드로 관련 노트 찾기
     */
    async findRelatedNotes(keywords, options = {}) {
        await this.ensureIndex();
        const limit = options.limit || 5;
        const scores = {};
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            // 키워드 인덱스
            const keywordPaths = this.index.keywordIndex[keywordLower] || [];
            for (const path of keywordPaths) {
                if (!scores[path])
                    scores[path] = { score: 0, keywords: [] };
                scores[path].score += 2;
                scores[path].keywords.push(keyword);
            }
            // 제목 매칭 (더 높은 점수)
            for (const [path, note] of Object.entries(this.index.notes)) {
                if (note.title.toLowerCase().includes(keywordLower)) {
                    if (!scores[path])
                        scores[path] = { score: 0, keywords: [] };
                    scores[path].score += 5;
                    if (!scores[path].keywords.includes(keyword)) {
                        scores[path].keywords.push(keyword);
                    }
                }
            }
        }
        // 점수순 정렬
        const sortedPaths = Object.entries(scores)
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, limit);
        const results = [];
        for (const [path, { score, keywords: matchedKeywords }] of sortedPaths) {
            const note = this.index.notes[path];
            if (note) {
                results.push({ note, score, matchedKeywords });
            }
        }
        return results;
    }
    /**
     * 특정 노트의 메타데이터 조회
     */
    async getNoteMetadata(path) {
        await this.ensureIndex();
        return this.index.notes[path] || null;
    }
    /**
     * 인덱스 통계
     */
    async getStatistics() {
        await this.ensureIndex();
        const topTags = Object.entries(this.index.tagIndex)
            .map(([tag, paths]) => [tag, paths.length])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        return {
            totalNotes: Object.keys(this.index.notes).length,
            totalTags: Object.keys(this.index.tagIndex).length,
            totalKeywords: Object.keys(this.index.keywordIndex).length,
            indexedAt: this.index.indexedAt,
            topTags,
        };
    }
    // ===========================================================================
    // Helper Methods
    // ===========================================================================
    shouldExclude(path) {
        return EXCLUDE_PATTERNS.some((pattern) => pattern.test(path));
    }
    async findMarkdownFiles(dir) {
        const files = [];
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!this.shouldExclude(entry.name)) {
                    files.push(...(await this.findMarkdownFiles(fullPath)));
                }
            }
            else if (entry.isFile() && extname(entry.name) === '.md') {
                files.push(fullPath);
            }
        }
        return files;
    }
    createEmptyIndex() {
        return {
            version: '1.0',
            indexedAt: new Date().toISOString(),
            vaultPath: this.vaultPath,
            notes: {},
            tagIndex: {},
            keywordIndex: {},
        };
    }
    async loadIndex() {
        const content = await readFile(this.indexPath, 'utf-8');
        return JSON.parse(content);
    }
    async saveIndex() {
        if (!this.index)
            return;
        await writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
    }
    async ensureIndex() {
        if (!this.index) {
            try {
                this.index = await this.loadIndex();
            }
            catch {
                this.index = await this.buildIndex();
            }
        }
    }
}
//# sourceMappingURL=vault-indexer.js.map