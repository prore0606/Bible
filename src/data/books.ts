// 성경 66권 목록 (docs/spec.md 6장). 코드는 표준 약어(USFM), 한국어 이름·장 수는 design/screens.html의 BIBLE과 같다.
// 절 수는 여기 두지 않는다 — 본문 JSON(public/bible/{ko,en}/{BOOK}.json)이 기준이다.

const RAW = [
  // 구약 39권
  ["GEN", "창세기", "Genesis", 50],
  ["EXO", "출애굽기", "Exodus", 40],
  ["LEV", "레위기", "Leviticus", 27],
  ["NUM", "민수기", "Numbers", 36],
  ["DEU", "신명기", "Deuteronomy", 34],
  ["JOS", "여호수아", "Joshua", 24],
  ["JDG", "사사기", "Judges", 21],
  ["RUT", "룻기", "Ruth", 4],
  ["1SA", "사무엘상", "1 Samuel", 31],
  ["2SA", "사무엘하", "2 Samuel", 24],
  ["1KI", "열왕기상", "1 Kings", 22],
  ["2KI", "열왕기하", "2 Kings", 25],
  ["1CH", "역대상", "1 Chronicles", 29],
  ["2CH", "역대하", "2 Chronicles", 36],
  ["EZR", "에스라", "Ezra", 10],
  ["NEH", "느헤미야", "Nehemiah", 13],
  ["EST", "에스더", "Esther", 10],
  ["JOB", "욥기", "Job", 42],
  ["PSA", "시편", "Psalms", 150],
  ["PRO", "잠언", "Proverbs", 31],
  ["ECC", "전도서", "Ecclesiastes", 12],
  ["SNG", "아가", "Song of Solomon", 8],
  ["ISA", "이사야", "Isaiah", 66],
  ["JER", "예레미야", "Jeremiah", 52],
  ["LAM", "예레미야애가", "Lamentations", 5],
  ["EZK", "에스겔", "Ezekiel", 48],
  ["DAN", "다니엘", "Daniel", 12],
  ["HOS", "호세아", "Hosea", 14],
  ["JOL", "요엘", "Joel", 3],
  ["AMO", "아모스", "Amos", 9],
  ["OBA", "오바댜", "Obadiah", 1],
  ["JON", "요나", "Jonah", 4],
  ["MIC", "미가", "Micah", 7],
  ["NAM", "나훔", "Nahum", 3],
  ["HAB", "하박국", "Habakkuk", 3],
  ["ZEP", "스바냐", "Zephaniah", 3],
  ["HAG", "학개", "Haggai", 2],
  ["ZEC", "스가랴", "Zechariah", 14],
  ["MAL", "말라기", "Malachi", 4],
  // 신약 27권
  ["MAT", "마태복음", "Matthew", 28],
  ["MRK", "마가복음", "Mark", 16],
  ["LUK", "누가복음", "Luke", 24],
  ["JHN", "요한복음", "John", 21],
  ["ACT", "사도행전", "Acts", 28],
  ["ROM", "로마서", "Romans", 16],
  ["1CO", "고린도전서", "1 Corinthians", 16],
  ["2CO", "고린도후서", "2 Corinthians", 13],
  ["GAL", "갈라디아서", "Galatians", 6],
  ["EPH", "에베소서", "Ephesians", 6],
  ["PHP", "빌립보서", "Philippians", 4],
  ["COL", "골로새서", "Colossians", 4],
  ["1TH", "데살로니가전서", "1 Thessalonians", 5],
  ["2TH", "데살로니가후서", "2 Thessalonians", 3],
  ["1TI", "디모데전서", "1 Timothy", 6],
  ["2TI", "디모데후서", "2 Timothy", 4],
  ["TIT", "디도서", "Titus", 3],
  ["PHM", "빌레몬서", "Philemon", 1],
  ["HEB", "히브리서", "Hebrews", 13],
  ["JAS", "야고보서", "James", 5],
  ["1PE", "베드로전서", "1 Peter", 5],
  ["2PE", "베드로후서", "2 Peter", 3],
  ["1JN", "요한일서", "1 John", 5],
  ["2JN", "요한이서", "2 John", 1],
  ["3JN", "요한삼서", "3 John", 1],
  ["JUD", "유다서", "Jude", 1],
  ["REV", "요한계시록", "Revelation", 22],
] as const;

export type BookCode = (typeof RAW)[number][0];
export type Testament = "OT" | "NT";

export type Book = {
  code: BookCode;
  ko: string;
  en: string;
  chapters: number;
  testament: Testament;
};

const OT_COUNT = 39;

/** 성경 순서대로 66권 */
export const BOOKS: readonly Book[] = RAW.map(([code, ko, en, chapters], i) => ({
  code,
  ko,
  en,
  chapters,
  testament: i < OT_COUNT ? "OT" : "NT",
}));

const BY_CODE: ReadonlyMap<string, Book> = new Map(BOOKS.map((b) => [b.code, b]));
const INDEX_BY_CODE: ReadonlyMap<string, number> = new Map(BOOKS.map((b, i) => [b.code, i]));

export function isBookCode(value: string): value is BookCode {
  return BY_CODE.has(value);
}

export function getBook(code: BookCode): Book {
  return BY_CODE.get(code)!;
}

/** 성경 순서에서 몇 번째 책인지 (0부터) */
export function bookIndex(code: BookCode): number {
  return INDEX_BY_CODE.get(code)!;
}

export function booksOf(testament: Testament): readonly Book[] {
  return BOOKS.filter((b) => b.testament === testament);
}
