// 성경 본문 JSON 생성: crizin/bible-db 의 JSONL → public/bible/{ko,en}/{BOOK}.json
//
// 사용법 (원본은 git 에 넣지 않고, 받아 둔 폴더를 --src 로 가리킨다):
//   git clone --depth 1 https://github.com/crizin/bible-db.git <임의 폴더>
//   node scripts/build-bible.mjs --src <임의 폴더>/data --commit <커밋 해시>
//
// 출력 구조 (docs/spec.md 6장): { "code", "name", "chapters": string[][] }  — chapters[장-1][절-1] = 본문
// 자세한 출처·라이선스·결정 사항은 docs/bible-data.md 에 있다.
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── 개역한글 교정 목록 ────────────────────────────────────────────────────────
// 기본 본문은 holybible.or.kr 수집본(절 번호가 KJV 와 같아 한·영 짝을 맞추기 쉽고 66권이 완전함)이다.
// 같은 본문을 대한성서공회 사이트(bible.bskorea.or.kr)에서 따로 수집한 것과 대조해, **뜻이 달라지는** 차이만
// 대한성서공회 표기로 바로잡는다. 철자·띄어쓰기·고유명사 표기 차이는 원본을 유지하고 docs/bible-data.md 에 남긴다.
// 원본이 아래와 다르면(출처가 바뀌었으면) 빌드를 멈춘다 — 조용히 틀린 글을 만들지 않기 위해서다.
const KRV_FIXES = [
  { code: "NUM", chapter: 18, verse: 11, before: "내게 돌릴 것이", after: "네게 돌릴 것이", why: "하나님이 아론에게 하시는 말씀 — '내게'가 아니라 '네게' (bskorea 표기)" },
  { code: "DEU", chapter: 9, verse: 12, before: "낸 내 백성이", after: "낸 네 백성이", why: "하나님이 모세에게 '네가 인도하여 낸 네 백성' (bskorea 표기)" },
  { code: "ISA", chapter: 48, verse: 13, before: "하늘에", after: "하늘을", why: "'하늘을 폈나니' (bskorea 표기)" },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

const readJsonl = (file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

// src/data/books.ts 의 목록을 읽는다 (책 코드·이름·장 수가 앱과 어긋나지 않게 같은 곳을 기준으로 삼는다)
function readBooks() {
  const ts = readFileSync(join(root, "src", "data", "books.ts"), "utf8");
  const books = [...ts.matchAll(/\["([0-9A-Z]{3})", "([^"]+)", "([^"]+)", (\d+)\]/g)].map((m) => ({
    code: m[1],
    ko: m[2],
    en: m[3],
    chapters: Number(m[4]),
  }));
  if (books.length !== 66) throw new Error(`books.ts 에서 66권을 읽지 못했습니다 (${books.length}권)`);
  return books;
}

/** JSONL 행들을 chapters[장-1][절-1] 로 바꾼다. 번호가 연속이 아니면 멈춘다. */
function toBooks(rows, books, label) {
  const byBook = new Map(books.map((b) => [b.code, new Map()]));
  for (const r of rows) {
    const chapters = byBook.get(r.code);
    if (!chapters) throw new Error(`[${label}] 알 수 없는 책 코드: ${r.code}`);
    if (!chapters.has(r.chapter)) chapters.set(r.chapter, new Map());
    const verses = chapters.get(r.chapter);
    if (verses.has(r.verse)) throw new Error(`[${label}] 절이 중복됩니다: ${r.code} ${r.chapter}:${r.verse}`);
    verses.set(r.verse, r.text);
  }
  const result = new Map();
  for (const book of books) {
    const chapters = byBook.get(book.code);
    const arr = [];
    for (let c = 1; c <= book.chapters; c += 1) {
      const verses = chapters.get(c);
      if (!verses) throw new Error(`[${label}] ${book.code} ${c}장이 없습니다`);
      const list = [];
      for (let v = 1; v <= verses.size; v += 1) {
        const text = verses.get(v);
        if (text === undefined) throw new Error(`[${label}] ${book.code} ${c}:${v} 절 번호가 비어 있습니다`);
        if (!text.trim() || text !== text.trim()) throw new Error(`[${label}] ${book.code} ${c}:${v} 본문이 비었거나 공백이 붙어 있습니다`);
        list.push(text);
      }
      arr.push(list);
    }
    if (chapters.size !== book.chapters) throw new Error(`[${label}] ${book.code} 장 수가 다릅니다 (${chapters.size} / ${book.chapters})`);
    result.set(book.code, arr);
  }
  return result;
}

function applyFixes(ko) {
  for (const fix of KRV_FIXES) {
    const text = ko.get(fix.code)?.[fix.chapter - 1]?.[fix.verse - 1];
    if (text === undefined) throw new Error(`교정 대상 절이 없습니다: ${fix.code} ${fix.chapter}:${fix.verse}`);
    const first = text.indexOf(fix.before);
    if (first === -1 || text.indexOf(fix.before, first + 1) !== -1) {
      throw new Error(`교정 대상 문구가 한 번만 나와야 합니다: ${fix.code} ${fix.chapter}:${fix.verse} "${fix.before}"\n  현재: ${text}`);
    }
    ko.get(fix.code)[fix.chapter - 1][fix.verse - 1] = text.replace(fix.before, fix.after);
  }
}

function writeLang(outDir, lang, map, books, nameKey) {
  const dir = join(outDir, lang);
  mkdirSync(dir, { recursive: true });
  let raw = 0;
  let gz = 0;
  for (const b of books) {
    const json = JSON.stringify({ code: b.code, name: b[nameKey], chapters: map.get(b.code) });
    writeFileSync(join(dir, `${b.code}.json`), json);
    raw += Buffer.byteLength(json);
    gz += gzipSync(json).length;
  }
  return { raw, gz };
}

const count = (map) => [...map.values()].reduce((s, chs) => s + chs.reduce((t, v) => t + v.length, 0), 0);
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.src) throw new Error("--src <crizin/bible-db 의 data 폴더> 가 필요합니다");
  const src = resolve(args.src);
  const outDir = resolve(args.out ?? join(root, "public", "bible"));

  const books = readBooks();
  const ko = toBooks(readJsonl(join(src, "krv", "krv_holybible.jsonl")), books, "개역한글");
  const en = toBooks(readJsonl(join(src, "kjv", "kjv.jsonl")), books, "KJV");
  applyFixes(ko);

  const koSize = writeLang(outDir, "ko", ko, books, "ko");
  const enSize = writeLang(outDir, "en", en, books, "en");

  const manifest = {
    schema: 1,
    books: 66,
    chapters: 1189,
    languages: {
      ko: { version: "개역한글판 (1961)", publisher: "대한성서공회", verses: count(ko), collectedFrom: "holybible.or.kr" },
      en: { version: "King James Version (1769)", verses: count(en), collectedFrom: "scrollmapper/bible_databases (CrossWire KJV2006 / eBible.org)" },
    },
    source: { repository: "https://github.com/crizin/bible-db", commit: args.commit ?? "unknown" },
    koFixes: KRV_FIXES.map(({ code, chapter, verse, before, after }) => ({ ref: `${code} ${chapter}:${verse}`, before, after })),
  };
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  // 한·영 장별 절 수가 다른 곳 (둘을 함께 볼 때 짝이 비는 곳)
  const mismatches = [];
  for (const b of books) {
    ko.get(b.code).forEach((verses, i) => {
      const enCount = en.get(b.code)[i].length;
      if (verses.length !== enCount) mismatches.push(`${b.code} ${i + 1}장: ko ${verses.length}절 / en ${enCount}절`);
    });
  }

  console.log(`ko: ${manifest.languages.ko.verses}절, ${mb(koSize.raw)} (gzip ${mb(koSize.gz)})`);
  console.log(`en: ${manifest.languages.en.verses}절, ${mb(enSize.raw)} (gzip ${mb(enSize.gz)})`);
  console.log(`교정 ${KRV_FIXES.length}곳 적용`);
  console.log(`한·영 절 수가 다른 장 ${mismatches.length}개:\n  ${mismatches.join("\n  ")}`);
  console.log(`출력: ${outDir} (${statSync(join(outDir, "manifest.json")).size} bytes manifest)`);
}

main();
