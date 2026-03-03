import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { toMentionToken } from "./promptMentionTokens";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeMention(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function tokenizeTemplate(value, mentionOptions) {
  const lookup = new Map();
  mentionOptions.forEach((option) => {
    const token = toMentionToken(option.label).slice(1);
    lookup.set(normalizeMention(token), { ...option, token });
    lookup.set(normalizeMention(option.label), { ...option, token });
  });

  const text = String(value || "");
  const segments = [];
  let cursor = 0;

  for (const match of text.matchAll(/@([^\s@]+)/g)) {
    const start = match.index || 0;
    const end = start + match[0].length;
    const rawToken = match[1];
    const matchedOption = lookup.get(normalizeMention(rawToken));

    if (start > cursor) {
      segments.push({ type: "text", value: text.slice(cursor, start) });
    }

    if (matchedOption) {
      segments.push({
        type: "mention",
        label: matchedOption.label,
        token: matchedOption.token,
      });
    } else {
      segments.push({ type: "text", value: match[0] });
    }

    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", value: text.slice(cursor) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: "" });
  }

  return segments;
}

function buildEditorHtml(value, mentionOptions) {
  const segments = tokenizeTemplate(value, mentionOptions);

  return segments
    .map((segment) => {
      if (segment.type === "mention") {
        const escapedLabel = escapeHtml(segment.label);
        const escapedToken = escapeHtml(segment.token);

        return `<span class="mention-inline-chip" contenteditable="false" data-mention-token="${escapedToken}" title="@${escapedToken}"><span class="mention-inline-chip-icon" aria-hidden="true">🔗</span><span class="mention-inline-chip-label">${escapedLabel}</span></span>`;
      }

      return escapeHtml(segment.value).replace(/\n/g, "<br>");
    })
    .join("");
}

function serializeEditorText(root) {
  if (!root) return "";

  const readNode = (node) => {
    if (!node) return "";

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node;

    if (element.matches(".mention-inline-chip")) {
      return `@${element.dataset.mentionToken || ""}`;
    }

    if (element.tagName === "BR") {
      return "\n";
    }

    let text = "";
    Array.from(element.childNodes).forEach((child) => {
      text += readNode(child);
    });

    if (["DIV", "P", "LI"].includes(element.tagName)) {
      return `${text}\n`;
    }

    return text;
  };

  let result = "";
  Array.from(root.childNodes).forEach((node) => {
    result += readNode(node);
  });

  return result.replace(/\n+$/g, "");
}

function placeCursorAtEnd(element) {
  if (!element) return;
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);

  selection.removeAllRanges();
  selection.addRange(range);
}

export default function PromptTokenEditor({ value, mentionOptions, onChange }) {
  const editorRef = useRef(null);
  const composingRef = useRef(false);

  const mentionButtons = useMemo(
    () =>
      mentionOptions.map((option) => ({
        ...option,
        token: toMentionToken(option.label).slice(1),
      })),
    [mentionOptions]
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const serialized = serializeEditorText(editor);
    if (serialized === String(value || "")) return;

    const nextHtml = buildEditorHtml(value, mentionOptions);
    editor.innerHTML = nextHtml;
  }, [mentionOptions, value]);

  const emitChange = useCallback(() => {
    const nextValue = serializeEditorText(editorRef.current);
    onChange(nextValue);
  }, [onChange]);

  const insertMention = useCallback(
    (token, label) => {
      const editor = editorRef.current;
      if (!editor) return;

      editor.focus();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        placeCursorAtEnd(editor);
      }

      const activeSelection = window.getSelection();
      if (!activeSelection || activeSelection.rangeCount === 0) return;

      const range = activeSelection.getRangeAt(0);
      const mentionNode = document.createElement("span");
      mentionNode.className = "mention-inline-chip";
      mentionNode.contentEditable = "false";
      mentionNode.dataset.mentionToken = token;
      mentionNode.title = `@${token}`;
      mentionNode.innerHTML = `<span class="mention-inline-chip-icon" aria-hidden="true">🔗</span><span class="mention-inline-chip-label">${escapeHtml(label)}</span>`;

      const trailingSpace = document.createTextNode(" ");

      range.deleteContents();
      range.insertNode(trailingSpace);
      range.insertNode(mentionNode);

      const newRange = document.createRange();
      newRange.setStartAfter(trailingSpace);
      newRange.collapse(true);
      activeSelection.removeAllRanges();
      activeSelection.addRange(newRange);

      emitChange();
    },
    [emitChange]
  );

  return (
    <div className="prompt-token-editor">
      <div className="prompt-token-toolbar" role="list" aria-label="참조 노드 토큰">
        {mentionButtons.map((option) => (
          <button
            key={option.id}
            type="button"
            className="mention-toolbar-button"
            role="listitem"
            onClick={() => insertMention(option.token, option.label)}
          >
            <span aria-hidden="true">🔗</span>
            {option.label}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        className="config-editor prompt-rich-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder="프롬프트를 입력하세요. 상단 노드 버튼을 누르면 커서 위치에 토큰이 들어갑니다."
        onInput={() => {
          if (composingRef.current) return;
          emitChange();
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
          emitChange();
        }}
      />
    </div>
  );
}
