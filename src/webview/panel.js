const { getMcpSharkIframeHtml, getStartServerHtml } = require("./html");
const { ensureMcpSharkRunning, isMcpSharkRunning, isMcpSharkSetupComplete, stopMcpSharkServer } = require("../mcp-shark");
const { setActivePanel } = require("./panelState");

const createDatabasePanel = async ({ context, vscode }) => {
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
  const panel = vscode.window.createWebviewPanel(
    "mcpSharkDatabase",
    "MCP Shark",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [mediaRoot],
    }
  );

  const imageUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "image.png"));
  setActivePanel(panel);
  const isRunning = await isMcpSharkRunning();

  if (!isRunning) {
    panel.webview.html = getStartServerHtml({ imageUri });

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === "startServer") {
          // Update HTML to show output area
          panel.webview.html = getStartServerHtml({ 
            imageUri, 
            showOutput: true,
            output: "Starting server...\n"
          });

          await ensureMcpSharkRunning({ vscode, webviewPanel: panel });

          setTimeout(async () => {
            const running = await isMcpSharkRunning();
            if (running) {
              const isSetupComplete = await isMcpSharkSetupComplete();
              const route = isSetupComplete ? "traffic" : "setup";
              panel.webview.html = getMcpSharkIframeHtml({ route });
            } else {
              panel.webview.html = getStartServerHtml({
                message: "Server may still be starting. Please wait a moment and try again.",
                imageUri,
                showOutput: true,
              });
            }
          }, 3000);
          return;
        }

        if (message.command === "checkStatus") {
          const running = await isMcpSharkRunning();
          if (running) {
            const isSetupComplete = await isMcpSharkSetupComplete();
            const route = isSetupComplete ? "traffic" : "setup";
            panel.webview.html = getMcpSharkIframeHtml({ route });
          } else {
            panel.webview.postMessage({ command: "statusUpdate", running: false });
          }
        }
      },
      null,
      context.subscriptions
    );

    return panel;
  }

  // Check setup status and route accordingly
  const isSetupComplete = await isMcpSharkSetupComplete();
  const route = isSetupComplete ? "traffic" : "setup";
  panel.webview.html = getMcpSharkIframeHtml({ route });

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === "checkStatus") {
        const running = await isMcpSharkRunning();
        if (!running) {
          panel.webview.html = getStartServerHtml({
            message: "MCP Shark server stopped. Please start it again.",
            imageUri,
          });
        } else {
          // Re-check setup status when server is running
          const isSetupComplete = await isMcpSharkSetupComplete();
          const route = isSetupComplete ? "traffic" : "setup";
          panel.webview.html = getMcpSharkIframeHtml({ route });
        }
        return;
      }

      if (message.command === "stopServer") {
        await stopMcpSharkServer({ vscode });

        setTimeout(async () => {
          const running = await isMcpSharkRunning();
          if (!running) {
            panel.webview.html = getStartServerHtml({
              message: "MCP Shark server has been stopped.",
              imageUri,
            });
          }
        }, 2000);
      }
    },
    null,
    context.subscriptions
  );

  return panel;
};

module.exports = {
  createDatabasePanel,
};


