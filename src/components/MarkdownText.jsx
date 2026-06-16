import { cn } from "@/lib/utils";

const RTL_CHAR_RE = /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
const LTR_CHAR_RE = /[A-Za-z\u00C0-\u024F]/;

function detectTextDirection(text) {
  const value = String(text || "");

  for (const char of value) {
    if (RTL_CHAR_RE.test(char)) return "rtl";
    if (LTR_CHAR_RE.test(char)) return "ltr";
  }

  return "ltr";
}

function getDirectionalStyle(text) {
  const direction = detectTextDirection(text);

  return {
    direction,
    textAlign: direction === "rtl" ? "right" : "left",
    unicodeBidi: "plaintext",
  };
}

function renderInlineMarkdown(text, keyPrefix = "inline") {
  const tokens = String(text || "").split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={key} className="rounded-md bg-black/10 px-1.5 py-0.5 text-[0.92em] font-medium">
          {token.slice(1, -1)}
        </code>
      );
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={key} className="italic">{token.slice(1, -1)}</em>;
    }

    return <span key={key}>{token}</span>;
  });
}

function flushList(blocks, listType, listItems) {
  if (!listItems.length) return;

  blocks.push({
    type: listType,
    items: [...listItems],
  });
  listItems.length = 0;
}

function parseMarkdownLines(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const paragraph = [];
  const listItems = [];
  let listType = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({
      type: "paragraph",
      text: paragraph.join(" ").replace(/\s+/g, " ").trim(),
    });
    paragraph.length = 0;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList(blocks, listType, listItems);
      listType = null;
      return;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList(blocks, listType, listItems);
      listType = null;
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      return;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") {
        flushList(blocks, listType, listItems);
      }
      listType = "ul";
      listItems.push(unorderedMatch[1].trim());
      return;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") {
        flushList(blocks, listType, listItems);
      }
      listType = "ol";
      listItems.push(orderedMatch[1].trim());
      return;
    }

    if (line.includes("|") && /^\|?(.+\|)+.+\|?$/.test(line)) {
      flushParagraph();
      flushList(blocks, listType, listItems);
      listType = null;
      blocks.push({
        type: "tableRow",
        cells: line.split("|").map((cell) => cell.trim()).filter(Boolean),
      });
      return;
    }

    flushList(blocks, listType, listItems);
    listType = null;
    paragraph.push(line);
  });

  flushParagraph();
  flushList(blocks, listType, listItems);

  return blocks;
}

function renderMarkdownBlocks(part, sectionKey) {
  const rawBlocks = parseMarkdownLines(part);
  const rendered = [];
  let tableRows = [];

  const flushTable = () => {
    if (!tableRows.length) return;

    const rows = tableRows.filter((row) => !row.cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
    const [header, ...body] = rows;
    const direction = detectTextDirection(rows.flatMap((row) => row.cells).join(" "));
    const tableKey = `${sectionKey}-table-${rendered.length}`;

    if (header) {
      rendered.push(
        <div key={tableKey} className="my-4 overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[420px] border-collapse text-sm" style={getDirectionalStyle(rows.flatMap((row) => row.cells).join(" "))}>
            <thead className="bg-black/5">
              <tr>
                {header.cells.map((cell, index) => (
                  <th key={`${tableKey}-h-${index}`} className={cn("px-3 py-2 font-semibold", direction === "rtl" ? "text-right" : "text-left")}>
                    {renderInlineMarkdown(cell, `${tableKey}-h-${index}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={`${tableKey}-r-${rowIndex}`} className="border-t border-black/10">
                  {row.cells.map((cell, cellIndex) => (
                    <td key={`${tableKey}-r-${rowIndex}-${cellIndex}`} className={cn("px-3 py-2", direction === "rtl" ? "text-right" : "text-left")}>
                      {renderInlineMarkdown(cell, `${tableKey}-r-${rowIndex}-${cellIndex}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }

    tableRows = [];
  };

  rawBlocks.forEach((block, blockIndex) => {
    const key = `${sectionKey}-${blockIndex}`;

    if (block.type === "tableRow") {
      tableRows.push(block);
      return;
    }

    flushTable();

    if (block.type === "heading") {
      rendered.push(
        <h3
          key={key}
          className={cn(
            "mt-5 font-semibold leading-snug text-[var(--bm-text-primary)]",
            block.level <= 2 ? "text-[19px]" : "text-[17px]",
          )}
          style={getDirectionalStyle(block.text)}
        >
          {renderInlineMarkdown(block.text, key)}
        </h3>,
      );
      return;
    }

    if (block.type === "ul" || block.type === "ol") {
      const ListTag = block.type;
      rendered.push(
        <ListTag
          key={key}
          className={cn(
            "space-y-2",
            block.type === "ul" ? "list-disc" : "list-decimal",
            detectTextDirection(block.items.join(" ")) === "rtl"
              ? "mr-6 pr-2"
              : "ml-6 pl-2",
          )}
          style={getDirectionalStyle(block.items.join(" "))}
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`} className="pl-1">
              {renderInlineMarkdown(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </ListTag>,
      );
      return;
    }

    rendered.push(
      <p key={key} className="leading-[1.9]" style={getDirectionalStyle(block.text)}>
        {renderInlineMarkdown(block.text, key)}
      </p>,
    );
  });

  flushTable();

  return rendered;
}

export default function MarkdownText({ text, className = "" }) {
  const value = String(text || "");
  const parts = value.split(/```/g);
  const baseStyle = getDirectionalStyle(value);

  return (
    <div
      className={cn("space-y-4 break-words text-[16px] font-normal leading-[1.9] text-[var(--bm-text-primary)]", className)}
      style={{ ...baseStyle, letterSpacing: 0 }}
    >
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          const language = part.match(/^(\w+)\n/)?.[1] || "";
          const code = part.replace(/^\w+\n/, "");

          return (
            <pre
              key={index}
              className="my-4 overflow-x-auto rounded-2xl bg-black/10 p-4 text-left text-sm leading-relaxed"
              dir="ltr"
            >
              <code>{language ? code : part}</code>
            </pre>
          );
        }

        return (
          <div key={index} className="space-y-3">
            {renderMarkdownBlocks(part, `${index}`)}
          </div>
        );
      })}
    </div>
  );
}

export { detectTextDirection, getDirectionalStyle };
