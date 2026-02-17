const CORE_FIELDS = [
  { key: "summary", type: "string", description: "결과 요약", required: true },
  { key: "result_text", type: "string", description: "다음 노드에서 바로 쓸 본문", required: true },
  { key: "keywords", type: "array", description: "핵심 키워드", required: true, itemsType: "string" },
];

function normalizeType(type) {
  const t = String(type || "string").trim().toLowerCase();
  const allowed = ["string", "number", "boolean", "object", "array", "null"];
  return allowed.includes(t) ? t : "string";
}

function makeUsedInputsSchema(varKeys) {
  const schemaProperties = varKeys.length
    ? Object.fromEntries(
        varKeys.map((key) => [
          key,
          {
            type: ["string", "number", "boolean", "object", "array", "null"],
            description: "업스트림 노드에서 전달된 값",
          },
        ])
      )
    : {
        note: {
          type: "string",
          description: "업스트림 입력이 없을 때 기본 안내",
        },
      };

  return {
    type: "object",
    properties: schemaProperties,
    additionalProperties: true,
  };
}

function makeFieldSchema(field) {
  const type = normalizeType(field.type);
  if (type === "array") {
    return {
      type: "array",
      description: field.description || "",
      items: { type: normalizeType(field.itemsType || "string") },
    };
  }
  return {
    type,
    description: field.description || "",
  };
}

export function parseTemplateFieldsText(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const [key = "", type = "string", description = "", requiredMark = ""] = line.split("|");
      const cleanKey = key.trim();
      if (!cleanKey) return null;
      const normalizedRequired = ["required", "yes", "y", "필수", "true", "1"].includes(
        requiredMark.trim().toLowerCase()
      );
      return {
        key: cleanKey,
        type: normalizeType(type),
        description: description.trim(),
        required: normalizedRequired,
      };
    })
    .filter(Boolean);
}

function makeSchemaFromTemplate(varKeys, templateFieldsText, enforceCoreFields = true) {
  const templateFields = parseTemplateFieldsText(templateFieldsText);
  const baseFields = enforceCoreFields ? CORE_FIELDS : [];
  const mergedFields = [...baseFields, ...templateFields];

  const properties = {};
  const required = [];

  for (const field of mergedFields) {
    if (!field.key) continue;
    properties[field.key] = makeFieldSchema(field);
    if (field.required) required.push(field.key);
  }

  properties.used_inputs = makeUsedInputsSchema(varKeys);
  required.push("used_inputs");

  return {
    type: "object",
    required: Array.from(new Set(required)),
    properties,
    additionalProperties: true,
  };
}

export function resolveSchemaConfig(vars, cfg = {}) {
  const varKeys = Object.keys(vars || {}).sort();
  const responseMode = cfg.responseMode || "schema";

  if (responseMode === "freeform") {
    return {
      responseMode,
      freeformGuide: cfg.freeformGuide || "",
      schema: null,
      error: "",
    };
  }

  if (cfg.schemaMode === "json" && cfg.schemaText?.trim()) {
    try {
      const parsed = JSON.parse(cfg.schemaText.trim());
      return { responseMode, freeformGuide: "", schema: parsed, error: "" };
    } catch (err) {
      return {
        responseMode,
        freeformGuide: "",
        schema: null,
        error: `스키마 JSON 파싱 실패: ${err?.message || String(err)}`,
      };
    }
  }

  return {
    responseMode,
    freeformGuide: "",
    schema: makeSchemaFromTemplate(varKeys, cfg.schemaFieldsText || "", cfg.enforceCoreFields !== false),
    error: "",
  };
}

export function tryParseJsonObject(text) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}
