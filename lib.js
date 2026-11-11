// Pure logic (no vscode dependency) so it can be tested outside the editor.
const cp = require("child_process");
const os = require("os");
const path = require("path");

const INSTRUCTIONS = `You rewrite prompts that a developer will send to a coding agent (Claude Code).
Improve clarity, specificity and structure while keeping the author's intent, scope and voice.
Do NOT add requirements the author did not imply; if something essential is ambiguous, phrase it
as a short question inside the prompt rather than guessing. Preserve code, file paths,
identifiers and quoted text exactly. Keep it concise: a short paragraph or a short list, not an essay.
The input was copied from a terminal, so stray hard line breaks may exist mid-sentence; reflow them.
Output ONLY the rewritten prompt, with no preamble, quotes or commentary.`;

function augmentedEnv() {
  // GUI-launched editors often lack the user's shell PATH; add the usual Claude Code install dirs.
  const home = os.homedir(), sep = path.delimiter, extra = [];
  if (process.platform === "win32") {
    if (process.env.APPDATA) extra.push(path.join(process.env.APPDATA, "npm"));
    extra.push(path.join(home, ".local", "bin"));
  } else {
    extra.push(path.join(home, ".local", "bin"), path.join(home, ".claude", "local"), "/opt/homebrew/bin", "/usr/local/bin");
  }
  return { ...process.env, PATH: [process.env.PATH || "", ...extra].join(sep) };
}

function run(cmd, args, input, opts) {
  return new Promise((resolve, reject) => {
    const p = cp.spawn(cmd, args, { cwd: os.tmpdir(), env: augmentedEnv(), ...opts });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 && out.trim() ? resolve(out.trim()) : reject(new Error(err.trim() || "claude returned no output"))
    );
    p.stdin.end(input);
  });
}

// Works on macOS, Linux and Windows. No special characters in args, so shell:true on Windows is safe
// (needed there because npm installs claude as claude.cmd).
async function improve(text, model, claudePath) {
  const bin = claudePath || "claude";
  const args = ["-p"].concat(model ? ["--model", model] : []);
  const input = `${INSTRUCTIONS}\n\nRewrite this prompt:\n\n<prompt>\n${text}\n</prompt>`;
  const win = process.platform === "win32";
  try {
    return await run(bin, args, input, { shell: win });
  } catch (e) {
    if (e.code !== "ENOENT" || win) throw e;
    // not on PATH: retry via the user's login shell (picks up ~/.zshrc / ~/.bashrc PATH setup)
    return await run(process.env.SHELL || "/bin/sh", ["-lc", 'claude "$@"', "claude", ...args], input, {});
  }
}

const len = (s) => [...s].length;
const isRule = (l) => /^[─━—-]{10,}\s*$/.test(l.trim());

// Given the whole copied terminal text, return what is typed in Claude Code's prompt box
// ("" if empty / not found). Box layout: rule, "❯ text" + "  continuation" lines, rule.
function extractPrompt(text) {
  const lines = text.split(/\r?\n/);
  let start = -1, marker = "❯";
  const find = (m) => { for (let i = lines.length - 1; i >= 0; i--) if (lines[i].startsWith(m) && (lines[i].length === 1 || /[\s\u00a0]/.test(lines[i][1]))) return i; return -1; };
  start = find("❯");
  if (start < 0) { start = find(">"); marker = ">"; } // fallback for consoles that render the prompt as ">"
  if (start < 0) return "";
  let end = start + 1;
  while (end < lines.length && !isRule(lines[end])) end++;
  if (end >= lines.length) return "";
  const width = len(lines[end].trim());
  const raw = lines.slice(start, end);
  const rows = raw.map((l, i) => (i === 0 ? l.slice(marker.length).replace(/^[\s\u00a0]/, "") : l.replace(/^ {1,2}/, "")));
  // is rows[i] a soft wrap into rows[i+1]? (the next word did not fit on the line)
  let out = rows[0] ?? "";
  for (let i = 1; i < rows.length; i++) {
    const prevFull = len(raw[i - 1].replace(/\s+$/, ""));
    const nextWord = (rows[i].match(/^\S+/) || [""])[0];
    const wrapped = prevFull + 1 + len(nextWord) > width && rows[i].length > 0;
    out += (wrapped ? " " : "\n") + rows[i];
  }
  out = out.replace(/\s+$/, "");
  if (/^Try "/.test(out)) return ""; // Claude Code's placeholder hint
  return out;
}

module.exports = { improve, extractPrompt, INSTRUCTIONS };
