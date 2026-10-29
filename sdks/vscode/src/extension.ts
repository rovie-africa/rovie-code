// This method is called when your extension is deactivated
export function deactivate() {}

import * as vscode from "vscode"

const TERMINAL_NAME = "rovie"
const LEGACY_TERMINAL_NAME = "opencode"

export function activate(context: vscode.ExtensionContext) {
  const openTerminalHandler = async () => {
    // A rovie or opencode terminal already exists => focus it
    const existingTerminal = vscode.window.terminals.find(
      (t: vscode.Terminal) => t.name === TERMINAL_NAME || t.name === LEGACY_TERMINAL_NAME,
    )
    if (existingTerminal) {
      existingTerminal.show()
      return
    }

    await openTerminal()
  }

  const openNewTerminalHandler = async () => {
    await openTerminal()
  }

  const addFilepathHandler = async () => {
    const fileRef = getActiveFile()
    if (!fileRef) return

    const terminal = vscode.window.activeTerminal
    if (!terminal) return

    if (terminal.name === TERMINAL_NAME || terminal.name === LEGACY_TERMINAL_NAME) {
      terminal.sendText(fileRef, false)
      terminal.show()
    }
  }

  // Register modern rovie.* commands
  context.subscriptions.push(
    vscode.commands.registerCommand("rovie.openTerminal", openTerminalHandler),
    vscode.commands.registerCommand("rovie.openNewTerminal", openNewTerminalHandler),
    vscode.commands.registerCommand("rovie.addFilepathToTerminal", addFilepathHandler),
    // Backward-compatible opencode.* command aliases
    vscode.commands.registerCommand("opencode.openTerminal", openTerminalHandler),
    vscode.commands.registerCommand("opencode.openNewTerminal", openNewTerminalHandler),
    vscode.commands.registerCommand("opencode.addFilepathToTerminal", addFilepathHandler),
  )

  async function openTerminal() {
    // Create a new terminal in split screen
    const terminal = vscode.window.createTerminal({
      name: TERMINAL_NAME,
      iconPath: {
        light: vscode.Uri.file(context.asAbsolutePath("images/button-dark.svg")),
        dark: vscode.Uri.file(context.asAbsolutePath("images/button-light.svg")),
      },
      location: {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
      },
      env: {
        ROVIE_CALLER: "vscode",
        OPENCODE_CALLER: "vscode",
      },
    })

    terminal.show()
    terminal.sendText("rovie")
  }

  function getActiveFile() {
    const activeEditor = vscode.window.activeTextEditor
    if (!activeEditor) {
      return
    }

    const document = activeEditor.document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
    if (!workspaceFolder) {
      return
    }

    // Get the relative path from workspace root
    const relativePath = vscode.workspace.asRelativePath(document.uri)
    let filepathWithAt = `@${relativePath}`

    // Check if there's a selection and add line numbers
    const selection = activeEditor.selection
    if (!selection.isEmpty) {
      // Convert to 1-based line numbers
      const startLine = selection.start.line + 1
      const endLine = selection.end.line + 1

      if (startLine === endLine) {
        // Single line selection
        filepathWithAt += `#L${startLine}`
      } else {
        // Multi-line selection
        filepathWithAt += `#L${startLine}-${endLine}`
      }
    }

    return filepathWithAt
  }
}
