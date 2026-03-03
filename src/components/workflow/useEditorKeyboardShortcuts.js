import { useEffect } from "react";

export function useEditorKeyboardShortcuts(workflow) {
  useEffect(() => {
    const isTypingTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();
      const isTextInput =
        tagName === "input" ||
        tagName === "textarea" ||
        target.isContentEditable ||
        target.closest("[contenteditable='true']");

      return Boolean(isTextInput);
    };

    const handleKeyDown = (event) => {
      const isMetaPressed = event.ctrlKey || event.metaKey;
      const isTyping = isTypingTarget(event.target);

      if (event.key === "Delete" && !isTyping) {
        event.preventDefault();
        workflow.deleteSelectedElements();
        return;
      }

      if (isTyping || !isMetaPressed) return;
      if (event.key.toLowerCase() !== "z") return;

      event.preventDefault();
      if (event.shiftKey) {
        workflow.redo();
        return;
      }
      workflow.undo();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workflow]);
}
