# Prompt Improvisor for Claude Code

Improve the prompt you've typed in the **Claude Code** terminal box with one click, right where it is.
No panel, no copy-paste. Don't like the result? One click puts your original back.

## How to use

1. In the integrated terminal, type a rough prompt into Claude Code (don't press Enter).
2. Click **✨ Improvise** in the status bar, or press `Cmd+Alt+P` (Windows/Linux: `Ctrl+Alt+P`).
3. The text in the box is replaced with an improved version. Nothing is sent.
4. Not happy? Click **↩ Revert** (or `Cmd+Alt+Z` / `Ctrl+Alt+Z`) to restore your original.
5. Press Enter to send, as usual. The Revert button goes away.

## Requirements

- [Claude Code](https://claude.com/claude-code) installed and logged in (`claude` works in a terminal).

## How it works / privacy

- It reads the prompt box from the terminal contents, sends **only that text** to your own `claude`
  command-line tool (`claude -p`) to rewrite it, then types the result back into the box.
- Your earlier conversation and your project files are not sent. The rewrite runs from a temporary folder.
- Your clipboard is restored after reading the terminal.
- The extension adds its commands to `terminal.integrated.commandsToSkipShell` so the Enter hook works
  (merged with VS Code's defaults).

## Settings

| Setting | Description |
|---|---|
| `improvise.model` | Model alias for rewriting, e.g. `haiku` for speed. Empty = default. |
| `improvise.claudePath` | Full path to `claude` if it isn't found automatically. |

## Known limits

- Developed and tested on **macOS**. Linux and Windows are supported in code but not yet verified.
- It reads Claude Code's on-screen prompt box, so a Claude Code update that changes that layout could break it.
- Long rewrites may be wordy for very short prompts; edit the result before sending if needed.

## License

MIT
