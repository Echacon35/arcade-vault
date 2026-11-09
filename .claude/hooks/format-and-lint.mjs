// Hook PostToolUse (Write|Edit|MultiEdit): deja el archivo tocado compacto.
// 1. Prettier (respeta .prettierrc.json y .prettierignore).
// 2. JS/TS: `eslint --fix` con las reglas del proyecto + `no-multiple-empty-lines`
//    en max 0, que borra las líneas en blanco sin tocar las que están dentro de
//    template literals.
// 3. CSS/JSON: borra las líneas en blanco a nivel de texto.
// 4. Prettier otra vez para que lo que corrigió ESLint quede con su formato.
// Markdown y demás se dejan solo con Prettier (las líneas en blanco tienen
// significado). Modo silencioso: siempre sale con 0.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const LINTABLE = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const STRIP_TEXT = new Set([".css", ".scss", ".json"]);
async function prettierWrite(prettier, file) {
  const info = await prettier.getFileInfo(file, {
    ignorePath: path.join(process.cwd(), ".prettierignore"),
  });
  if (info.ignored || !info.inferredParser) return;
  const source = readFileSync(file, "utf8");
  const options = (await prettier.resolveConfig(file)) ?? {};
  const output = await prettier.format(source, { ...options, filepath: file });
  if (output !== source) writeFileSync(file, output);
}
async function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }
  const filePath = input?.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) return;
  const projectDir = path.resolve(
    process.env.CLAUDE_PROJECT_DIR ||
      path.join(import.meta.dirname, "..", ".."),
  );
  const file = path.resolve(filePath);
  const rel = path.relative(projectDir, file);
  // Solo archivos dentro de este proyecto.
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return;
  process.chdir(projectDir);
  const ext = path.extname(file).toLowerCase();
  const prettier = await import("prettier");
  await prettierWrite(prettier, file);
  if (LINTABLE.has(ext)) {
    const { ESLint } = await import("eslint");
    const eslint = new ESLint({
      cwd: projectDir,
      fix: true,
      warnIgnored: false,
      overrideConfig: {
        rules: {
          "no-multiple-empty-lines": [
            "error",
            { max: 0, maxBOF: 0, maxEOF: 0 },
          ],
        },
      },
    });
    const results = await eslint.lintFiles([rel]);
    await ESLint.outputFixes(results);
  } else if (STRIP_TEXT.has(ext)) {
    const source = readFileSync(file, "utf8");
    const output = source.replace(/^[ \t]*\r?\n/gm, "");
    if (output !== source) writeFileSync(file, output);
  }
  await prettierWrite(prettier, file);
}
try {
  await main();
} catch {
  // Silencioso: nunca bloquea a Claude.
}
process.exit(0);
