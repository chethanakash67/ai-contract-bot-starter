import { parse, HTMLElement, TextNode, Node as HtmlNode } from "node-html-parser";

export function escapeLatex(str: string = ""): string {
  return str
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}$&#_%])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/[\u2013\u2014]/g, "--")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

function latexSection(title: string, body: string): string {
  return body ? `\\section*{${escapeLatex(title)}}\n${body}\n` : "";
}

function convertInline(node: HtmlNode): string {
  if (node instanceof TextNode) {
    return escapeLatex(node.text);
  }
  if (node instanceof HTMLElement) {
    const tag = node.tagName.toLowerCase();
    const content = node.childNodes.map(convertInline).join("");
    switch (tag) {
      case "strong":
      case "b":
        return `\\textbf{${content}}`;
      case "em":
      case "i":
        return `\\textit{${content}}`;
      case "u":
        return `\\underline{${content}}`;
      case "br":
        return "\\\\";
      case "a": {
        const href = escapeLatex(node.getAttribute("href") || "");
        return href ? `\\href{${href}}{${content || href}}` : content;
      }
      default:
        return content;
    }
  }
  return "";
}

function getTextAlign(el: HTMLElement | null): 'left' | 'center' | 'right' | 'justify' | null {
  if (!el) return null;
  const style = (el.getAttribute('style') || '').toLowerCase();
  const m = style.match(/text-align\s*:\s*(left|right|center|justify)/i);
  return (m?.[1] as any) || null;
}

function wrapAlign(content: string, align: string | null): string {
  if (!align) return content;
  switch (align) {
    case 'center':
      return `\\begin{center}\n${content}\n\\end{center}`;
    case 'right':
      return `\\begin{flushright}\n${content}\n\\end{flushright}`;
    case 'left':
      return `\\begin{flushleft}\n${content}\n\\end{flushleft}`;
    case 'justify':
      // ragged2e provides \justifying
      return `{\\justifying\n${content}\n}`;
    default:
      return content;
  }
}

function convertBlock(node: HtmlNode, level = 0): string {
  if (node instanceof TextNode) {
    const text = node.text.trim();
    return text ? escapeLatex(text) : "";
  }
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName.toLowerCase();
  const children = node.childNodes;
  // Handle explicit page breaks
  const cls = (node.getAttribute('class') || '').toLowerCase();
  if (cls.split(/\s+/).includes('page-break')) {
    return `\\newpage`;
  }
  const align = getTextAlign(node);
  switch (tag) {
    case "h1":
      return wrapAlign(`\\section*{${children.map(convertInline).join("")}}`, align);
    case "h2":
      return wrapAlign(`\\subsection*{${children.map(convertInline).join("")}}`, align);
    case "h3":
      return wrapAlign(`\\subsubsection*{${children.map(convertInline).join("")}}`, align);
    case "p":
      return wrapAlign(`${children.map(convertInline).join("")}\\par`, align);
    case "ul": {
      const items = children
        .filter((c) => c instanceof HTMLElement && (c as HTMLElement).tagName.toLowerCase() === "li")
        .map((li) => `  \\item ${li.childNodes.map(convertInline).join("")}`)
        .join("\n");
      return items ? wrapAlign(`\\begin{itemize}\n${items}\n\\end{itemize}`, align) : "";
    }
    case "ol": {
      const items = children
        .filter((c) => c instanceof HTMLElement && (c as HTMLElement).tagName.toLowerCase() === "li")
        .map((li) => `  \\item ${li.childNodes.map(convertInline).join("")}`)
        .join("\n");
      return items ? wrapAlign(`\\begin{enumerate}\n${items}\n\\end{enumerate}`, align) : "";
    }
    case "table": {
      const rows = node.querySelectorAll("tr");
      if (!rows.length) return "";
      const cols = rows[0].querySelectorAll("th,td").length || 1;
      const colSpec = Array(cols).fill("l").join(" |");
      const lines: string[] = [`\\begin{tabular}{${colSpec}}`, "\\hline"];
      for (const row of rows) {
        const cells = row.querySelectorAll("th,td");
        const rowText = cells.map((c) => c.childNodes.map(convertInline).join("")).join(" & ");
        lines.push(`${rowText} \\`);
        lines.push("\\hline");
      }
      lines.push("\\end{tabular}");
      return lines.join("\n");
    }
    case "blockquote":
      return `\\begin{quote}${children.map(convertInline).join("")}\\end{quote}`;
    case "hr":
      return "\\hrulefill";
    default:
      return wrapAlign(children.map((child) => convertBlock(child, level + 1)).filter(Boolean).join("\n"), align);
  }
}

function htmlToLatex(html: string | null | undefined): string {
  if (!html) return "";
  let root: HTMLElement;
  try {
    root = parse(html) as HTMLElement;
  } catch {
    return escapeLatex(html);
  }
  return root.childNodes
    .map((node) => convertBlock(node))
    .filter(Boolean)
    .join("\n\n");
}

export function buildAgreementLatex(opts: {
  kind?: string;
  title?: string;
  parties?: { a?: string; b?: string; provider?: string; client?: string };
  period?: { start?: string; end?: string };
  jurisdiction?: string;
  description?: string;
  fees?: string;
  timeline?: string;
  bodyHtml?: string;
  watermark?: string;
  documentDate?: string;
}): string {
  const {
    kind = 'contract',
    title = kind === 'proposal' ? 'Project Proposal' : 'Agreement',
    parties = {},
    period = {},
    jurisdiction,
    description,
    fees,
    timeline,
  } = opts || {} as any;

  const partyLine = (() => {
    if (parties.provider || parties.client) {
      return `${escapeLatex(parties.provider || '')} and ${escapeLatex(parties.client || '')}`.trim();
    }
    if (parties.a || parties.b) {
      return `${escapeLatex(parties.a || '')} and ${escapeLatex(parties.b || '')}`.trim();
    }
    return '';
  })();

  const bodyLatex = htmlToLatex(opts.bodyHtml);

  const watermarkText = escapeLatex(opts.watermark || 'VA');

  function formatDisplayDate(raw?: string): string {
    if (!raw) return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  const today = formatDisplayDate(opts.documentDate || period.start || undefined);
  const closingName = parties.provider || parties.a || 'Authorized Signatory';

  const lines: string[] = [];
  lines.push(`% Auto-generated LaTeX from ContractBot`);
  lines.push(`\\documentclass[12pt]{article}`);
  lines.push(`\\usepackage[margin=1in]{geometry}`);
  lines.push(`\\usepackage[T1]{fontenc}`);
  lines.push(`\\usepackage[utf8]{inputenc}`);
  lines.push(`\\usepackage{lmodern}`);
  lines.push(`\\usepackage{setspace}`);
  lines.push(`\\usepackage{hyperref}`);
  lines.push(`\\usepackage{enumitem}`);
  lines.push(`\\usepackage{array}`);
  lines.push(`\\usepackage{xcolor}`);
  lines.push(`\\usepackage{background}`);
  lines.push(`\\usepackage{ragged2e}`);
  lines.push(`\\usepackage{tikz}`);
  lines.push(`\\renewcommand{\\familydefault}{\\sfdefault}`);
  lines.push(`\\setlist{nosep}`);
  lines.push(`\\setlength{\\parskip}{0.75em}`);
  lines.push(`\\setlength{\\parindent}{0pt}`);
  lines.push(`\\backgroundsetup{angle=-30, scale=1, opacity=1, contents={\\tikz[remember picture, overlay]{\\node[text opacity=0.18, draw opacity=0.38, line width=2pt, minimum size=9cm, circle, draw=gray!65]{\\fontsize{64}{68}\\selectfont\\textcolor{gray!55}{${watermarkText}}};}}}`);
  lines.push(`\\newcommand{\\signatureline}[1]{\\par\\vspace{2em}\\noindent\\makebox[3in]{\\hrulefill}\\\\\\small #1\\par}`);
  lines.push(`\\begin{document}`);
  lines.push(`\\BgThispage`);

  lines.push(`\\begin{flushright}`);
  lines.push(`\\small ${escapeLatex(today)}\\\n`);
  lines.push(`\\end{flushright}`);

  lines.push(`\\vspace{1em}`);

  lines.push(`\\begin{center}`);
  lines.push(`\\LARGE\\textbf{${escapeLatex(title)}}\\\n`);
  if (partyLine) lines.push(`\\normalsize ${partyLine}\\\n`);
  if (period.start || period.end) {
    const periodText = `${escapeLatex(period.start || '')}${period.start && period.end ? ' to ' : ''}${escapeLatex(period.end || '')}`;
    lines.push(`\\small Engagement Period: ${periodText}\\\n`);
  }
  lines.push(`\\end{center}`);

  lines.push(`\\vspace{1em}`);

  lines.push(`\\begin{flushleft}`);
  if (parties.client || parties.b) {
    lines.push(`\\textbf{Prepared for:} ${escapeLatex(parties.client || parties.b || '')}\\\n`);
  }
  if (parties.provider || parties.a) {
    lines.push(`\\textbf{Prepared by:} ${escapeLatex(parties.provider || parties.a || '')}\\\n`);
  }
  lines.push(`\\end{flushleft}`);

  if (description && !bodyLatex) {
    lines.push(latexSection(kind === 'proposal' ? 'Executive Summary' : 'Description', escapeLatex(description)));
  }
  if (kind === 'proposal' && timeline) {
    lines.push(latexSection('Timeline', escapeLatex(timeline)));
  }
  if (fees) {
    lines.push(latexSection('Fees', escapeLatex(fees)));
  }
  if (jurisdiction) {
    lines.push(latexSection('Governing Law', `${escapeLatex(jurisdiction)} law applies.`));
  }

  if (bodyLatex) {
    lines.push(bodyLatex);
  }

  lines.push('\\section*{Acknowledgement}');
  lines.push('Thank you for the opportunity to collaborate. We look forward to delivering outstanding results.\\par');
  lines.push('Please review the terms above; signing below indicates acceptance.\\par');
  lines.push('\\vspace{1.5em}');
  lines.push(`\\textbf{${escapeLatex(closingName)}}\\\\`);
  lines.push('AutoProposals AI\\par');

  lines.push('\\section*{Signatures}');
  if (parties.provider || parties.client) {
    if (parties.provider) lines.push(`\\signatureline{${escapeLatex(parties.provider)}}`);
    if (parties.client) lines.push(`\\signatureline{${escapeLatex(parties.client)}}`);
  } else {
    if (parties.a) lines.push(`\\signatureline{${escapeLatex(parties.a)}}`);
    if (parties.b) lines.push(`\\signatureline{${escapeLatex(parties.b)}}`);
  }

  lines.push('\\end{document}');
  return lines.join('\n');
}
