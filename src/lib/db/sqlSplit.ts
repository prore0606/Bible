// SQL 스크립트를 문장 단위로 나눈다. 플러그인마다 ';' 처리가 달라서(특히 트리거 본문의 ';') 직접 나눠 한 문장씩 실행한다.
// 주석(-- , /* */)은 버리고, 문자열 안의 ';' 와 '--' 는 건드리지 않는다.
// 제한: CREATE TRIGGER 본문 안에 CASE ... END 로 끝나는 문장이 있으면 트리거 끝으로 잘못 볼 수 있다 (현재 스키마에는 없음).

export function splitStatements(script: string): string[] {
  const statements: string[] = [];
  let buf = "";
  let i = 0;
  const n = script.length;

  const isTrigger = () => /^\s*CREATE\s+(?:TEMP(?:ORARY)?\s+)?TRIGGER\b/i.test(buf);
  const endsWithEnd = () => /(?:^|[\s;])END\s*$/i.test(buf);

  const flush = () => {
    const stmt = buf.trim();
    if (stmt) statements.push(stmt);
    buf = "";
  };

  while (i < n) {
    const ch = script[i];
    const next = script[i + 1];

    if (ch === "-" && next === "-") {
      while (i < n && script[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(script[i] === "*" && script[i + 1] === "/")) i += 1;
      i += 2;
      buf += " ";
      continue;
    }
    if (ch === "'") {
      buf += ch;
      i += 1;
      while (i < n) {
        buf += script[i];
        if (script[i] === "'") {
          if (script[i + 1] === "'") {
            buf += "'";
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (ch === ";") {
      if (isTrigger() && !endsWithEnd()) {
        buf += ch; // 트리거 본문 안의 ';'
      } else {
        flush();
      }
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  flush();
  return statements;
}
