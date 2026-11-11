const vscode = require("vscode");
const { improve, extractPrompt } = require("./lib");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let busy = false, lastOriginal = null, runItem, revertItem;

async function readBox(term) {
  // Copy the whole terminal buffer, then pull the prompt box out of it. Clipboard is restored.
  const saved = await vscode.env.clipboard.readText();
  try {
    term.show(false);
    await sleep(150);
    await vscode.commands.executeCommand("workbench.action.terminal.selectAll");
    await vscode.commands.executeCommand("workbench.action.terminal.copySelection");
    await vscode.commands.executeCommand("workbench.action.terminal.clearSelection");
    return extractPrompt(await vscode.env.clipboard.readText());
  } finally {
    await vscode.env.clipboard.writeText(saved);
  }
}

async function replaceBox(term, text) {
  term.sendText("\x1b\x1b", false); // Esc Esc: Claude Code clears the box
  await sleep(250);
  // Type it (a paste >~10 lines would collapse into a "[pasted text]" placeholder). Alt+Enter = newline.
  term.sendText(text.replace(/\r?\n/g, "\x1b\r"), false);
}

function terminal() {
  const t = vscode.window.activeTerminal;
  if (!t) vscode.window.showWarningMessage("Improvise: open the Claude Code terminal first.");
  return t;
}

async function run() {
  if (busy) return;
  const term = terminal(); if (!term) return;
  busy = true; runItem.text = "$(loading~spin) Improving…";
  try {
    const original = await readBox(term);
    if (!original) { vscode.window.showInformationMessage("Improvise: type a prompt in the Claude Code box first."); return; }
    const cfg = vscode.workspace.getConfiguration("improvise");
    const improved = await improve(original, cfg.get("model"), cfg.get("claudePath"));
    if ((await readBox(term)) !== original) { vscode.window.showWarningMessage("Improvise: the prompt changed while improving; nothing replaced."); return; }
    lastOriginal = original;
    await replaceBox(term, improved);
    setRevertable(true);
  } catch (e) {
    vscode.window.showErrorMessage("Improvise failed: " + (e.message || e));
  } finally { busy = false; runItem.text = "$(sparkle) Improvise"; }
}

async function revert() {
  if (lastOriginal == null) return;
  const term = terminal(); if (!term) return;
  term.show(false); await sleep(150);
  await replaceBox(term, lastOriginal);
  setRevertable(false);
}

function setRevertable(on) {
  if (!on) lastOriginal = null;
  on ? revertItem.show() : revertItem.hide();
  vscode.commands.executeCommand("setContext", "improvise.canRevert", on);
}

// Enter in the terminal while Revert is showing = the prompt is being sent: reset to the Improvise button,
// then pass Enter through to the terminal as usual.
async function sent() {
  setRevertable(false);
  await vscode.commands.executeCommand("workbench.action.terminal.sendSequence", { text: "\r" });
}

function activate(context) {
  const mk = (text, tip, cmd, prio) => {
    const i = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, prio);
    i.text = text; i.tooltip = tip; i.command = cmd; context.subscriptions.push(i); return i;
  };
  runItem = mk("$(sparkle) Improvise", "Improve the prompt in the Claude Code box (Cmd/Ctrl+Alt+P)", "improvise.run", 101); runItem.show();
  revertItem = mk("$(discard) Revert", "Put back your original prompt (Cmd/Ctrl+Alt+Z)", "improvise.revert", 100);
  context.subscriptions.push(
    vscode.commands.registerCommand("improvise.run", run),
    vscode.commands.registerCommand("improvise.revert", revert),
    vscode.commands.registerCommand("improvise.sent", sent)
  );
}
module.exports = { activate };
