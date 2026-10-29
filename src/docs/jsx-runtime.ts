/**
 * Native Bun + TypeScript Zero-Dependency JSX SSR Runtime
 * Enables clean .tsx authoring for server-rendered HTML pages.
 */

export type SafeHtml = { __html: string };
export type JSXChild = string | number | boolean | null | undefined | SafeHtml | JSXChild[];

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChildren(children: JSXChild): string {
  if (children === null || children === undefined || typeof children === "boolean") {
    return "";
  }
  if (Array.isArray(children)) {
    return children.map(renderChildren).join("");
  }
  if (typeof children === "object" && "__html" in children) {
    return children.__html;
  }
  return escapeHtml(String(children));
}

export function raw(html: string): SafeHtml {
  return { __html: html };
}

export function Fragment(props: { children?: JSXChild }): SafeHtml {
  return { __html: renderChildren(props.children) };
}

export function jsx(
  tag: string | ((props: Record<string, any>) => SafeHtml),
  props: Record<string, any> | null,
): SafeHtml {
  const safeProps = props ?? {};

  if (typeof tag === "function") {
    return tag(safeProps);
  }

  const { children, dangerouslySetInnerHTML, ...attrs } = safeProps;
  let attrStr = "";

  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null || val === false) continue;
    const attrName = key === "className" ? "class" : key === "htmlFor" ? "for" : key;
    if (val === true) {
      attrStr += ` ${attrName}`;
    } else if (typeof val === "object" && key === "style") {
      const styleStr = Object.entries(val)
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
        .join(";");
      attrStr += ` style="${escapeHtml(styleStr)}"`;
    } else {
      attrStr += ` ${attrName}="${escapeHtml(String(val))}"`;
    }
  }

  if (VOID_ELEMENTS.has(tag)) {
    return { __html: `<${tag}${attrStr} />` };
  }

  const inner = dangerouslySetInnerHTML?.__html ?? renderChildren(children);
  return { __html: `<${tag}${attrStr}>${inner}</${tag}>` };
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export namespace JSX {
  export type Element = SafeHtml;
  export interface IntrinsicElements {
    [elemName: string]: Record<string, any>;
  }
}

