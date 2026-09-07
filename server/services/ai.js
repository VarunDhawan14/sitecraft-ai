import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import pMap from "p-map";
import { parse } from "@babel/parser";
import { posix as pathPosix } from "node:path";

import {
  FileCodeSchema,
  FilePlanSchema,
  RevisionResultSchema,
} from "./aiSchemas.js";

import {
  buildFileCodeSystem,
  FILE_PLAN_SYSTEM,
  REVISE_SYSTEM,
} from "./prompts.js";

import { normalizeContent } from "./contentNormalizer.js";

import {
  validateAndFixCode,
  validateRevisionContent,
} from "./codeValidator.js";

// ============================================================
// OpenRouter + MiniMax M3 Configuration
// ============================================================

const MODEL = process.env.OPENROUTER_MODEL || "minimax/minimax-m3:free";

const MAX_CONCURRENCY = Math.max(
  1,
  parseInt(process.env.AI_MAX_CONCURRENCY || "2", 10),
);

const AI_TIMEOUT_MS = Math.max(
  30000,
  parseInt(process.env.AI_TIMEOUT_MS || "180000", 10),
);

const FILE_MAX_OUTPUT_TOKENS = Math.max(
  2500,
  parseInt(process.env.AI_FILE_MAX_OUTPUT_TOKENS || "8000", 10),
);

const PLAN_MAX_OUTPUT_TOKENS = Math.max(
  1200,
  parseInt(process.env.AI_PLAN_MAX_OUTPUT_TOKENS || "2500", 10),
);

const REVISION_MAX_OUTPUT_TOKENS = Math.max(
  4000,
  parseInt(process.env.AI_REVISION_MAX_OUTPUT_TOKENS || "20000", 10),
);

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  process.env["openrouter-api"] ||
  process.env.OPENROUTER_API;

if (!OPENROUTER_API_KEY) {
  console.warn(
    "[AI] OpenRouter API key is missing. Set OPENROUTER_API_KEY (recommended) or openrouter-api in .env.",
  );
}

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY,

  headers: {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Sitecraft AI",
  },
});

const model = openrouter(MODEL);

// ============================================================
// Helpers
// ============================================================

function getErrorMessage(error) {
  if (!error) {
    return "Unknown AI error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.message) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

// ============================================================
// JSON Extraction
// ============================================================

function extractJsonObject(text) {
  const input = String(text || "").trim();

  if (!input) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = input
    .replace(/^```json\s*/i, "")
    .replace(/^```javascript\s*/i, "")
    .replace(/^```js\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      if (start === -1) {
        start = i;
      }

      depth++;
    } else if (char === "}") {
      if (start !== -1) {
        depth--;

        if (depth === 0) {
          return cleaned.slice(start, i + 1);
        }
      }
    }
  }

  throw new Error("AI response did not contain a complete JSON object");
}

// ============================================================
// JSX Repair
// ============================================================

function repairJsxEscapedQuotes(code) {
  const source = String(code || "");

  let result = "";
  let inJsxTag = false;
  let quote = null;
  let braceDepth = 0;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    // --------------------------------------------------------
    // Outside JSX tag
    // --------------------------------------------------------

    if (!inJsxTag) {
      if (
        char === "<" &&
        i + 1 < source.length &&
        /[A-Za-z]/.test(source[i + 1])
      ) {
        inJsxTag = true;
      }

      result += char;
      continue;
    }

    // --------------------------------------------------------
    // Inside JSX tag
    // --------------------------------------------------------

    if (char === "\\" && braceDepth === 0) {
      let slashEnd = i;

      while (slashEnd < source.length && source[slashEnd] === "\\") {
        slashEnd++;
      }

      if (source[slashEnd] === '"') {
        result += '"';
        i = slashEnd;

        quote = quote === '"' ? null : '"';

        continue;
      }

      result += char;
      continue;
    }

    // --------------------------------------------------------
    // Inside JSX attribute string
    // --------------------------------------------------------

    if (quote) {
      result += char;

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    // --------------------------------------------------------
    // Normal JSX quotes
    // --------------------------------------------------------

    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }

    // --------------------------------------------------------
    // JSX expression
    // --------------------------------------------------------

    if (char === "{") {
      braceDepth++;
      result += char;
      continue;
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      result += char;
      continue;
    }

    // --------------------------------------------------------
    // End JSX tag
    // --------------------------------------------------------

    if (char === ">" && quote === null && braceDepth === 0) {
      inJsxTag = false;
    }

    result += char;
  }

  return result;
}

function repairCommonJsxAttributeEscapes(code) {
  let output = String(code || "");

  // Examples:
  //
  // className=\"hello\"
  // aria-label=\"Menu\"
  // href=\"/home\"
  //
  // become:
  //
  // className="hello"
  // aria-label="Menu"
  // href="/home"

  output = output.replace(
    /(\b(?:className|class|id|title|aria-[\w-]+|data-[\w-]+|placeholder|href|src|alt|type|name|value|role|target|rel|action|method)\s*=\s*)\\+"/g,
    '$1"',
  );

  output = output.replace(/\\+"(?=\s+(?:[A-Za-z_:][\w:.-]*\s*=|\/?>))/g, '"');

  return output;
}

function isJavaScriptFile(path) {
  return path.endsWith(".js") || path.endsWith(".jsx");
}
function validateJavaScriptSyntax(code, filePath) {
  if (!isJavaScriptFile(filePath)) {
    return {
      valid: true,
      error: null,
    };
  }
  try {
    parse(String(code || ""), {
      sourceType: "unambiguous",

      plugins: ["jsx"],

      errorRecovery: false,
    });

    return {
      valid: true,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      error,
    };
  }
}
function getSyntaxErrorDetails(error) {
  if (!error) {
    return "Unknown syntax error";
  }

  const line = error.loc?.line ?? "?";

  const column = error.loc?.column ?? "?";

  return `${error.message} ` + `(line ${line}, column ${column})`;
}

function repairGeneratedCode(content) {
  if (content == null) {
    return "";
  }

  let code = normalizeContent(String(content));

  // First repair pass.
  code = repairJsxEscapedQuotes(code);

  // Targeted JSX attribute repair.
  code = repairCommonJsxAttributeEscapes(code);

  // Second JSX repair pass.
  code = repairJsxEscapedQuotes(code);

  // Handle double escaped JSX attributes.
  code = code.replace(
    /(\b(?:className|class|id|title|aria-[\w-]+|data-[\w-]+|placeholder|href|src|alt|type|name|value|role|target|rel|action|method)\s*=\s*)\\\\+"/g,
    '$1"',
  );

  code = code.trim();

  if (!code) {
    return "";
  }

  return `${code}\n`;
}

// ============================================================
// DeepSeek / OpenRouter Text Generation
// ============================================================

async function generateStructured({
  system,
  prompt,
  schema,
  maxRetries = 1,
  maxOutputTokens = 8000,
  label = "AI",
}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();

    try {
      console.log(
        `[AI] ${label} request started (attempt ${
          attempt + 1
        }/${maxRetries + 1})`,
      );

      const result = await generateText({
        model,
        system,
        prompt,

        maxOutputTokens,

        // Keep MiniMax reasoning low so the free model spends its
        // output budget on actual JSON/source code instead of excessive
        // internal reasoning.
        temperature: 0.2,

        abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      const { text, finishReason, usage } = result;

      const elapsed = Date.now() - startedAt;

      console.log(
        `[AI] ${label} response received in ${elapsed}ms (${
          text?.length || 0
        } chars)`,
      );

      console.log(`[AI DEBUG] Model: ${MODEL}`);

      console.log(`[AI DEBUG] Finish reason:`, finishReason);

      console.log(`[AI DEBUG] Text length:`, text?.length || 0);

      console.log(`[AI DEBUG] Usage:`, usage);

      if (!text || !text.trim()) {
        throw new Error(
          `Minimax returned an empty text response. Finish reason: ${
            finishReason || "unknown"
          }`,
        );
      }

      const jsonText = extractJsonObject(text);

      let parsed;

      try {
        parsed = JSON.parse(jsonText);
      } catch (jsonError) {
        throw new Error(
          `Invalid JSON returned by MiniMax: ${getErrorMessage(jsonError)}`,
        );
      }

      return schema.parse(parsed);
    } catch (error) {
      lastError = error;

      const elapsed = Date.now() - startedAt;

      console.warn(
        `[AI] ${label} failed after ${elapsed}ms: ${getErrorMessage(error)}`,
      );

      if (attempt < maxRetries) {
        console.warn(`[AI] Retrying ${label}...`);
      }
    }
  }

  throw lastError;
}

// ============================================================
// Local Dependency Safety
// ============================================================

function resolveLocalImport(fromFile, importPath) {
  if (!importPath || !importPath.startsWith(".")) return null;

  const fromDir = pathPosix.dirname(fromFile);
  let resolved = pathPosix.normalize(pathPosix.join(fromDir, importPath));

  if (!resolved.startsWith("/")) resolved = `/${resolved}`;

  return resolved;
}

function collectLocalImports(code) {
  const imports = new Set();
  const source = String(code || "");

  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /\brequire\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const value = match[1];
      if (value && value.startsWith(".")) imports.add(value);
    }
  }

  return [...imports];
}

function addMissingPlannedDependencies(plan) {
  const planned = new Set(
    plan.files.map((file) =>
      file.path.startsWith("/") ? file.path : `/${file.path}`,
    ),
  );

  let added = true;

  while (added) {
    added = false;

    for (const file of plan.files) {
      const imports = Array.isArray(file.imports) ? file.imports : [];

      for (const importPath of imports) {
        if (typeof importPath !== "string" || !importPath.startsWith(".")) {
          continue;
        }

        let target = resolveLocalImport(file.path, importPath);
        if (!target) continue;

        if (!pathPosix.extname(target)) target += ".js";
        if (planned.has(target)) continue;

        const isCss = target.endsWith(".css");

        plan.files.push(
          isCss
            ? {
                path: target,
                description: `Stylesheet required by ${file.path}`,
                exports: "none",
                imports: [],
              }
            : {
                path: target,
                description: `React component required by ${file.path}`,
                exports: "default component",
                imports: [],
              },
        );

        planned.add(target);
        added = true;

        console.warn(
          `[AI] Added missing dependency to generation plan: ${target}`,
        );
      }
    }
  }

  return plan;
}

function validateGeneratedImportTargets(files) {
  const missing = [];

  for (const [filePath, content] of Object.entries(files)) {
    if (!isJavaScriptFile(filePath)) continue;

    for (const importPath of collectLocalImports(content)) {
      const target = resolveLocalImport(filePath, importPath);

      if (!target) continue;

      const candidates = [
        target,
        `${target}.js`,
        `${target}.jsx`,
        `${target}.css`,
      ];

      const exists = candidates.some((candidate) => files[candidate] != null);

      if (!exists) {
        missing.push(`${filePath} -> ${target}`);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing local dependencies:\n${missing
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }

  return true;
}

// ============================================================
// Generate Single File
// ============================================================

// ============================================================
// Generate Single File
// ============================================================

async function generateSingleFile(
  file,
  allFiles,
  prompt,
  alreadyGeneratedFiles,
) {
  const system = buildFileCodeSystem(allFiles, alreadyGeneratedFiles);

  const userMsg = `
Project:
${prompt}

Write the complete source code for:

${file.path}

Purpose:
${file.description}

IMPORTANT:
- Return the complete source code.
- All local JavaScript/JSX imports MUST include the exact .js extension.
- Do not omit any part of the file.
- Follow the project's existing components and imports.
- Use plain JavaScript/JSX only.
- Do not use TypeScript.
- JSX attributes MUST use normal quotes.
- Use className="..." instead of className=\\"...\\"
- NEVER write escaped JSX attributes.
- NEVER write className=\\\\"...\\\\"
- NEVER write id=\\\\"...\\\\"
- NEVER put backslashes before JSX attribute quotes.
- JavaScript string escaping is allowed only inside JavaScript strings.
- The final source code must be valid React code.
- Every component must have a default export.
`;

  console.log(`[AI] Creating file: ${file.path}...`);

  const object = await generateStructured({
    schema: FileCodeSchema,
    system,
    prompt: userMsg,
    maxRetries: 1,
    maxOutputTokens: FILE_MAX_OUTPUT_TOKENS,
    label: file.path,
  });

  // ----------------------------------------------------------
  // Repair immediately after AI response
  // ----------------------------------------------------------

  let code = repairGeneratedCode(object.code);

  if (code.trim().length === 0) {
    throw new Error(`Generated code for ${file.path} is empty`);
  }

  // ----------------------------------------------------------
  // Existing project validator
  // ----------------------------------------------------------

  const validation = validateAndFixCode(code, file.path, {
    allPlannedFiles: allFiles,
  });

  code = repairGeneratedCode(validation.code);

  if (validation.warnings.length > 0) {
    console.log(
      `[Validator] Code adjustments for ${file.path}:\n  - ${validation.warnings.join(
        "\n  - ",
      )}`,
    );
  }

  // ----------------------------------------------------------
  // REAL SYNTAX VALIDATION
  // ----------------------------------------------------------

  let syntaxCheck = validateJavaScriptSyntax(code, file.path);

  // ----------------------------------------------------------
  // AUTOMATIC AI REPAIR
  // ----------------------------------------------------------

  if (!syntaxCheck.valid) {
    const syntaxError = getSyntaxErrorDetails(syntaxCheck.error);

    console.warn(`[SyntaxValidator] ${file.path} is invalid: ${syntaxError}`);

    console.log(`[AI] Asking Minimax to repair ${file.path}...`);

    const repairPrompt = `
You generated this React JavaScript/JSX file:

${file.path}

The file has a syntax error and MUST be corrected.

EXACT SYNTAX ERROR:
${syntaxError}

CURRENT SOURCE CODE:

----- BEGIN CURRENT CODE -----
${code}
----- END CURRENT CODE -----

TASK:

Return the COMPLETE corrected source code.

IMPORTANT:
- Do NOT redesign the file.
- Do NOT remove existing functionality.
- Do NOT simplify the UI.
- Do NOT change the component architecture.
- Only fix the syntax/runtime-breaking code necessary to make this file valid.

STRICT JAVASCRIPT/JSX RULES:

1. Return ONLY source code.
2. Do NOT return markdown fences.
3. Do NOT explain anything.
4. Use plain JavaScript/JSX only.
5. Do NOT use TypeScript.
6. Every string literal must be properly closed.
7. Every template literal must be properly closed.
8. Every object and array must be properly closed.
9. Every parenthesis and bracket must be properly closed.
10. Every JSX opening tag must have a matching closing tag.
11. JSX self-closing elements must use />.
12. JSX attributes must use normal quotes.
13. NEVER write escaped JSX attributes such as:
    className=\\\\"example\\\\"
14. NEVER put unnecessary backslashes before JSX attribute quotes.
15. JavaScript strings containing apostrophes must use double quotes or backticks.
16. NEVER create an invalid single-quoted string such as:
    const text = 'Here's something';
17. NEVER create an unterminated regular expression.
18. Be extremely careful with JavaScript regex literals.
19. If a regex is not necessary, prefer normal string methods instead.
20. Do not accidentally place / characters inside a regex literal without escaping them.
21. Preserve all existing imports and exports.
22. Preserve the existing component name.
23. Preserve the existing UI and functionality.
24. The final source MUST successfully parse as JavaScript/JSX.

Before returning the answer, mentally verify:

- strings
- regex literals
- template literals
- brackets
- parentheses
- JSX tags
- JSX attributes
- imports
- exports

Return ONLY the corrected source code.
`;

    const repairedObject = await generateStructured({
      schema: FileCodeSchema,
      system: buildFileCodeSystem(allFiles, alreadyGeneratedFiles),
      prompt: repairPrompt,
      maxRetries: 1,
      maxOutputTokens: FILE_MAX_OUTPUT_TOKENS,
      label: `${file.path} SYNTAX REPAIR`,
    });

    code = repairGeneratedCode(repairedObject.code);

    const repairedValidation = validateAndFixCode(code, file.path, {
      allPlannedFiles: allFiles,
    });

    code = repairGeneratedCode(repairedValidation.code);

    // ----------------------------------------------------------
    // Validate AGAIN after AI repair
    // ----------------------------------------------------------

    syntaxCheck = validateJavaScriptSyntax(code, file.path);

    if (!syntaxCheck.valid) {
      const finalSyntaxError = getSyntaxErrorDetails(syntaxCheck.error);

      throw new Error(
        `Syntax validation failed for ${file.path} even after automatic AI repair: ${finalSyntaxError}`,
      );
    }

    console.log(`[SyntaxValidator] ${file.path} repaired successfully.`);
  }

  // ----------------------------------------------------------
  // Final safety validation
  // ----------------------------------------------------------

  syntaxCheck = validateJavaScriptSyntax(code, file.path);

  if (!syntaxCheck.valid) {
    throw new Error(
      `Invalid JavaScript/JSX in ${file.path}: ${getSyntaxErrorDetails(
        syntaxCheck.error,
      )}`,
    );
  }

  console.log(`[SyntaxValidator] ${file.path} passed.`);

  if (validation.warnings.length > 0) {
    console.log(
      `[Validator] Code adjustments for ${file.path}:\n  - ${validation.warnings.join(
        "\n  - ",
      )}`,
    );
  }

  // ----------------------------------------------------------
  // Final cleanup
  // ----------------------------------------------------------

  if (code.trim().length === 0) {
    throw new Error(
      `Generated code for ${file.path} became empty after validation`,
    );
  }

  console.log(`[AI] Created file: ${file.path} (${code.length} chars)`);

  return {
    path: file.path,
    code,
  };
}

// ============================================================
// Generate Complete Project
// ============================================================

export async function generateProject(prompt, callbacks) {
  console.log(`[AI] Using model: ${MODEL}`);

  console.log(
    `[AI] Phase 1: Planning file structure for: "${prompt.slice(0, 80)}..."`,
  );

  // ----------------------------------------------------------
  // PHASE 1 — PLAN
  // ----------------------------------------------------------

  const plan = await generateStructured({
    schema: FilePlanSchema,
    system: FILE_PLAN_SYSTEM,
    prompt: `
Plan a complete React website for:

${prompt}

Requirements:
- Entry point must be /App.js
- Global styles must be /styles.css
- Components must be inside /components/
- Use plain JavaScript/JSX
- Every component should have a default export
- Keep the number of files reasonable
- Avoid unnecessary components
- Every local import used by a planned file must have its target file included in the plan.
- Do not invent imports for files that are not planned.
- If App.js imports a component, that component must appear in the plan.
`,
    maxRetries: 1,
    maxOutputTokens: PLAN_MAX_OUTPUT_TOKENS,
    label: "PROJECT PLAN",
  });

  // ----------------------------------------------------------
  // Guarantee App.js
  // ----------------------------------------------------------

  if (!plan.files.find((f) => f.path === "/App.js")) {
    plan.files.unshift({
      path: "/App.js",
      description: "Main application entry point",
      exports: "default App",
      imports: ["./styles.css"],
    });
  }

  // ----------------------------------------------------------
  // Guarantee styles.css
  // ----------------------------------------------------------

  if (!plan.files.find((f) => f.path === "/styles.css")) {
    plan.files.push({
      path: "/styles.css",
      description:
        "Global CSS: Google Font import, keyframe animations, utility classes",
      exports: "none",
      imports: [],
    });
  }

  // Repair planner dependency omissions before generation starts.
  addMissingPlannedDependencies(plan);

  if (callbacks?.onPlan) {
    await callbacks.onPlan(plan);
  }

  console.log(
    `[AI] Phase 2: Generating ${
      plan.files.length
    } files with concurrency=${MAX_CONCURRENCY}`,
  );

  console.log(`[AI] Files: ${plan.files.map((f) => f.path).join(", ")}`);

  // ----------------------------------------------------------
  // PHASE 2 — GENERATE FILES
  // ----------------------------------------------------------

  const files = {};

  let pendingFiles = plan.files.map((f) => ({
    ...f,
  }));

  // Only one retry round.
  // This keeps OpenRouter usage controlled.
  const maxRetryRounds = 2;

  for (let round = 0; round <= maxRetryRounds; round++) {
    if (pendingFiles.length === 0) {
      break;
    }

    if (round > 0) {
      console.log(
        `[AI] Retry round ${round}/${maxRetryRounds} for ${
          pendingFiles.length
        } files: ${pendingFiles.map((f) => f.path).join(", ")}`,
      );
    }

    const results = await pMap(
      pendingFiles,
      async (file) => {
        try {
          if (callbacks?.onFileStart) {
            await callbacks.onFileStart(file.path);
          }

          const singleResult = await generateSingleFile(
            file,
            plan.files,
            prompt,
            files,
          );

          const normalizedPath = singleResult.path.startsWith("/")
            ? singleResult.path
            : `/${singleResult.path}`;

          files[normalizedPath] = singleResult.code;

          if (callbacks?.onFileComplete) {
            await callbacks.onFileComplete(file.path, singleResult.code);
          }

          return {
            success: true,
            file,
            result: singleResult,
          };
        } catch (error) {
          console.error(
            `[AI] Failed generating ${file.path}:`,
            getErrorMessage(error),
          );

          return {
            success: false,
            file,
            error,
          };
        }
      },
      {
        concurrency: MAX_CONCURRENCY,
      },
    );

    const failedFiles = [];

    for (const entry of results) {
      if (!entry.success) {
        console.warn(
          `[AI] File ${entry.file.path} failed in round ${round}: ${getErrorMessage(
            entry.error,
          )}`,
        );

        failedFiles.push(entry.file);
      }
    }

    pendingFiles = failedFiles;
  }

  // ----------------------------------------------------------
  // FAIL PROJECT IF REQUIRED FILES COULD NOT BE GENERATED
  // ----------------------------------------------------------

  if (pendingFiles.length > 0) {
    const failedPaths = pendingFiles.map((f) => f.path).join(", ");

    console.error(
      `[AI] Failed to generate ${pendingFiles.length} files after all retry rounds: ${failedPaths}`,
    );

    throw new Error(
      `Project generation failed. Could not generate: ${failedPaths}`,
    );
  }

  // ----------------------------------------------------------
  // Final App.js check
  // ----------------------------------------------------------

  if (!files["/App.js"]) {
    throw new Error("AI did not generate /App.js entry point");
  }

  // ----------------------------------------------------------
  // Final cleanup
  // ----------------------------------------------------------

  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith(".js") || path.endsWith(".jsx")) {
      files[path] = repairGeneratedCode(content);
    }
  }

  // ----------------------------------------------------------
  // Final dependency validation
  // ----------------------------------------------------------

  validateGeneratedImportTargets(files);

  // ----------------------------------------------------------
  // Final validation
  // ----------------------------------------------------------

  for (const [path, content] of Object.entries(files)) {
    if (path.endsWith(".js") || path.endsWith(".jsx")) {
      try {
        const validation = validateAndFixCode(content, path, {
          allPlannedFiles: plan.files,
        });

        let finalCode = repairGeneratedCode(validation.code);

        const syntaxCheck = validateJavaScriptSyntax(finalCode, path);

        if (!syntaxCheck.valid) {
          throw new Error(getSyntaxErrorDetails(syntaxCheck.error));
        }

        files[path] = finalCode;

        if (validation.warnings.length > 0) {
          console.log(
            `[Validator] Final adjustments for ${path}:\n  - ${validation.warnings.join(
              "\n  - ",
            )}`,
          );
        }
      } catch (error) {
        throw new Error(
          `Final validation failed for ${path}: ${getErrorMessage(error)}`,
        );
      }
    }
  }

  console.log(
    `[AI] Project generation completed successfully. ${
      Object.keys(files).length
    } files ready.`,
  );

  return {
    files,
    description: plan.projectDescription,
  };
}

// ============================================================
// Revise Existing Project
// ============================================================

function selectRelevantFiles(prompt, files, maxFiles = 3) {
  const request = String(prompt || "").toLowerCase();

  const entries = Object.entries(files || {});

  const scored = entries.map(([path, content]) => {
    const lowerPath = path.toLowerCase();
    const lowerContent = String(content || "").toLowerCase();

    let score = 0;

    // Explicit filename mention
    const fileName = lowerPath
      .split("/")
      .pop()
      ?.replace(/\.(js|jsx|css)$/, "");

    if (fileName && request.includes(fileName)) {
      score += 100;
    }

    // Common UI keywords
    const keywordMap = {
      navbar: ["header", "navbar", "navigation", "nav"],
      header: ["header", "navbar", "navigation", "nav"],
      hero: ["hero"],
      pricing: ["pricing", "price"],
      testimonial: ["testimonial", "testimonials"],
      footer: ["footer"],
      button: ["button", "cta"],
      cta: ["cta", "button"],
      theme: ["styles.css", "css"],
      color: ["styles.css", "css"],
      background: ["styles.css", "css"],
      font: ["styles.css", "css"],
      typography: ["styles.css", "css"],
      layout: ["app.js", "styles.css"],
      section: ["app.js"],
      page: ["app.js"],
    };

    for (const [keyword, targets] of Object.entries(keywordMap)) {
      if (request.includes(keyword)) {
        if (targets.some((target) => lowerPath.includes(target))) {
          score += 50;
        }
      }
    }

    // App.js is often required for adding/removing sections
    if (
      lowerPath === "/app.js" &&
      /(add|remove|delete|section|component|feature|page)/.test(request)
    ) {
      score += 30;
    }

    // styles.css is commonly needed for visual changes
    if (
      lowerPath.endsWith("styles.css") &&
      /(theme|color|background|font|spacing|style|design|visual|dark|light)/.test(
        request,
      )
    ) {
      score += 40;
    }

    return {
      path,
      content,
      score,
    };
  });

  return Object.fromEntries(
    scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map(({ path, content }) => [path, content]),
  );
}

export async function reviseProject(
  prompt,
  manifest,
  relevantFiles,
  recentMessages,
) {
  const contextParts = [];
  const selectedFiles = selectRelevantFiles(prompt, relevantFiles, 3);
  const validationFiles = {
    ...selectedFiles,
  };

  console.log(
    `[AI] Selected ${Object.keys(selectedFiles).length} relevant files for revision:`,
    Object.keys(selectedFiles),
  );

  // ----------------------------------------------------------
  // Manifest
  // ----------------------------------------------------------

  contextParts.push("## Current Project Files (manifest)");

  contextParts.push("```");

  for (const f of manifest) {
    contextParts.push(`${f.path} (${f.hash}, ${f.size}B)`);
  }

  contextParts.push("```");

  // ----------------------------------------------------------
  // Relevant files
  // ----------------------------------------------------------

  if (Object.keys(selectedFiles).length > 0) {
    contextParts.push("\n## Relevant files");

    for (const [path, content] of Object.entries(selectedFiles)) {
      contextParts.push(`\n### ${path}\n\`\`\`javascript\n${content}\n\`\`\``);
    }
  }

  // ----------------------------------------------------------
  // Recent conversation
  // ----------------------------------------------------------

  if (recentMessages.length > 0) {
    contextParts.push("\n## Recent Conversation");

    for (const msg of recentMessages.slice(-3)) {
      contextParts.push(`${msg.role}: ${msg.content}`);
    }
  }

  // ----------------------------------------------------------
  // Revision request
  // ----------------------------------------------------------

  contextParts.push(`\n## Revision Request\n${prompt}`);

  console.log(`[AI] Revising project using model: ${MODEL}...`);

  const rawParsed = await generateStructured({
    schema: RevisionResultSchema,
    system: REVISE_SYSTEM,
    prompt: contextParts.join("\n"),
    maxRetries: 1,
    maxOutputTokens: REVISION_MAX_OUTPUT_TOKENS,
    label: "PROJECT REVISION",
  });

  // ----------------------------------------------------------
  // Normalize operations
  // ----------------------------------------------------------

  if (rawParsed && Array.isArray(rawParsed.operations)) {
    rawParsed.operations = rawParsed.operations
      .map((op) => {
        if (!op || typeof op !== "object") {
          return op;
        }

        let opStr = String(op.op || "")
          .trim()
          .toLowerCase();

        // ------------------------------------------------
        // Normalize operation
        // ------------------------------------------------

        if (["create", "add", "new"].includes(opStr)) {
          op.op = "create";
        } else if (["update", "edit", "modify", "patch"].includes(opStr)) {
          op.op = "update";
        } else if (["delete", "remove", "del", "rm"].includes(opStr)) {
          op.op = "delete";
        }

        // ------------------------------------------------
        // Normalize path
        // ------------------------------------------------

        if (
          op.path &&
          typeof op.path === "string" &&
          !op.path.startsWith("/")
        ) {
          op.path = `/${op.path}`;
        }

        // ------------------------------------------------
        // Reject unrelated update/delete operations
        // ------------------------------------------------

        if (
          (op.op === "update" || op.op === "delete") &&
          !selectedFiles[op.path]
        ) {
          console.warn(
            `[AI] Ignoring ${op.op} operation for unrelated file: ${op.path}`,
          );

          return null;
        }

        // ------------------------------------------------
        // Create operation
        // ------------------------------------------------

        if (op.op === "create" && op.content) {
          // ------------------------------------------------
          // 1. Initial cleanup
          // ------------------------------------------------

          op.content = repairGeneratedCode(op.content);

          // ------------------------------------------------
          // 2. Existing revision validator
          // ------------------------------------------------

          const validation = validateRevisionContent(
            op.content,
            op.path,
            "create",
          );

          // Apply any changes made by the validator
          op.content = repairGeneratedCode(validation.content);

          if (validation.warnings.length > 0) {
            console.log(
              `[Validator] Revision Create adjustments for ${op.path}:\n  - ${validation.warnings.join(
                "\n  - ",
              )}`,
            );
          }

          // ------------------------------------------------
          // 3. FINAL JavaScript / JSX syntax validation
          // ------------------------------------------------

          const syntaxCheck = validateJavaScriptSyntax(op.content, op.path);

          if (!syntaxCheck.valid) {
            throw new Error(
              `Revision created invalid JavaScript in ${op.path}: ${getSyntaxErrorDetails(
                syntaxCheck.error,
              )}`,
            );
          }

          console.log(
            `[SyntaxValidator] Revision create passed for ${op.path}.`,
          );
        } else if (op.op === "update" && op.replace) {
          // ------------------------------------------------
          // 1. Normalize search and replacement
          // ------------------------------------------------

          op.search = normalizeContent(op.search || "");
          op.replace = normalizeContent(op.replace || "");

          if (!op.search) {
            throw new Error(
              `Revision update for ${op.path} is missing search text.`,
            );
          }

          // ------------------------------------------------
          // 2. Get the original complete file
          // ------------------------------------------------

          const originalContent = validationFiles[op.path];

          if (originalContent == null) {
            throw new Error(
              `Cannot validate revision update: ${op.path} was not provided as a relevant file.`,
            );
          }

          // ------------------------------------------------
          // 3. Make sure search text exists
          // ------------------------------------------------

          if (!originalContent.includes(op.search)) {
            throw new Error(
              `Revision search text was not found in ${op.path}.`,
            );
          }

          // ------------------------------------------------
          // 4. Apply search -> replace to create the
          //    COMPLETE updated file
          // ------------------------------------------------

          const updatedContent = originalContent.replace(op.search, op.replace);

          // ------------------------------------------------
          // 5. Existing revision validator
          // ------------------------------------------------

          const validation = validateRevisionContent(
            updatedContent,
            op.path,
            "update",
          );

          if (validation.warnings.length > 0) {
            console.log(
              `[Validator] Revision Update adjustments for ${op.path}:\n  - ${validation.warnings.join(
                "\n  - ",
              )}`,
            );
          }

          // ------------------------------------------------
          // 6. FINAL JavaScript / JSX syntax validation
          //    Validate the COMPLETE updated file,
          //    NOT op.replace
          // ------------------------------------------------

          const syntaxCheck = validateJavaScriptSyntax(
            validation.content,
            op.path,
          );

          if (!syntaxCheck.valid) {
            throw new Error(
              `Revision produced invalid JavaScript in ${op.path}: ${getSyntaxErrorDetails(
                syntaxCheck.error,
              )}`,
            );
          }
          validationFiles[op.path] = validation.content;

          console.log(
            `[SyntaxValidator] Revision update passed for ${op.path}.`,
          );
        }

        // ------------------------------------------------
        // Search strings
        // ------------------------------------------------

        if (op.search) {
          op.search = normalizeContent(op.search);
        }

        return op;
      })
      .filter(Boolean);
  }

  console.log(`[AI] Project revision generated successfully.`);

  return rawParsed;
}
