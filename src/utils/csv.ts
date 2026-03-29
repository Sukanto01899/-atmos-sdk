import { SdkError } from "../types";

const stripUtf8Bom = (text: string) => {
  if (!text) return text;
  // U+FEFF (BOM) sometimes appears at the start of CSV content.
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
};

const parseCsvTable = (text: string) => {
  const input = stripUtf8Bom(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    // ignore trailing empty row caused by ending newline
    if (row.length === 1 && row[0] === "" && rows.length === 0) return;
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        const next = input[index + 1];
        if (next === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushField();
      pushRow();
      continue;
    }

    if (char === "\r") {
      const next = text[index + 1];
      if (next === "\n") {
        index += 1;
      }
      pushField();
      pushRow();
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new SdkError("E_CSV", "Unterminated CSV quoted field.");
  }

  pushField();
  pushRow();

  // Trim trailing completely empty rows
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell === "")) {
    rows.pop();
  }

  return rows;
};

export const parseCsvWithHeader = (text: string, maxRows: number) => {
  const table = parseCsvTable(text);
  if (table.length === 0) return { rows: [], header: [] as string[] };
  const header = table[0].map((col) => col.trim());

  const rows = table.slice(1, maxRows + 1).map((values) => {
    const record: Record<string, unknown> = {};
    header.forEach((key, index) => {
      record[key] = (values[index] ?? "").trim();
    });
    return record;
  });

  return { header, rows };
};
