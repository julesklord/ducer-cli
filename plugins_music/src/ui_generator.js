/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**

/**
 * Generates an Ultra-Premium HTML document with Reaper-inspired audio analytics.
 */
export function generatePremiumHTML(markdown, fileName) {
    const escapedMarkdown = JSON.stringify(markdown);
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DUCER REPORT - ${escapeHtml(fileName)}</title>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    ${getDAWStyles()}
</head>
<body>
    <header>
        <div class="header-title-container">
            <span class="ducer-logo">DUCER // PRODUCER EDITION</span>
            <h1>Audio Intelligence Audit</h1>
            <div class="file-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                ${escapeHtml(fileName)}
            </div>
        </div>
        <div class="waveform-visualizer">
            <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
        </div>
    </header>

    <div class="container">
        <div class="controls">
            <button id="btn-report" class="active" onclick="setView('report')">Detailed Report</button>
            <button id="btn-dashboard" onclick="setView('dashboard')">PRO Dashboard</button>
        </div>
        <div id="content" class="view-report"></div>
    </div>

    <footer>
        Ducer Intelligence Layer • Port of Gemini-CLI Producer Edition • ${new Date().getFullYear()}
    </footer>

    <script>
        var rawMarkdown = ${escapedMarkdown};
        
        marked.use({ gfm: true, breaks: true });

        function render() {
            var contentDiv = document.getElementById("content");
            var isDashboard = contentDiv.classList.contains("view-dashboard");

            if (isDashboard) {
                var sections = rawMarkdown.split(/^## /m);
                var html = "";
                for (var i = 0; i < sections.length; i++) {
                    var sec = sections[i];
                    if (!sec.trim() || i === 0) continue;
                    var lines = sec.split("\\n");
                    var title = lines[0].trim();
                    var body = lines.slice(1).join("\\n").trim();
                    if (!body) continue;
                    html += "<section><h2>" + title + "</h2>" + marked.parse(body) + "</section>";
                }
                contentDiv.innerHTML = html;
            } else {
                contentDiv.innerHTML = marked.parse(rawMarkdown);
            }

            if (typeof mermaid !== "undefined") {
                mermaid.initialize({ startOnLoad: false, theme: "dark" });
                var codeBlocks = document.querySelectorAll("code.language-mermaid");
                codeBlocks.forEach((el, index) => {
                    var mermaidCode = el.textContent;
                    var id = "mermaid-" + Date.now() + "-" + index;
                    var parent = el.parentElement;
                    var div = document.createElement("div");
                    div.className = "mermaid";
                    div.id = id;
                    parent.parentNode.insertBefore(div, parent);
                    parent.style.display = "none";
                    mermaid.render(id + "-svg", mermaidCode).then(res => {
                        div.innerHTML = res.svg;
                    });
                });
            }
        }

        function setView(view) {
            var contentDiv = document.getElementById("content");
            document.getElementById("btn-report").classList.toggle("active", view === "report");
            document.getElementById("btn-dashboard").classList.toggle("active", view === "dashboard");
            contentDiv.className = view === "dashboard" ? "view-dashboard" : "view-report";
            render();
        }

        render();
    </script>
</body>
</html>`;
}
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function getDAWStyles() {
    return `<style>
    :root {
      --bg-base: #09090b; --bg-surface: #18181b; --bg-surface-hover: #27272a;
      --border-subtle: #3f3f46; --text-primary: #f4f4f5; --text-secondary: #a1a1aa;
      --accent-main: #3b82f6; --accent-glow: rgba(59, 130, 246, 0.5);
      --accent-cyan: #06b6d4; --accent-purple: #8b5cf6;
      --font-ui: "Inter", system-ui, sans-serif; --font-mono: "JetBrains Mono", monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: var(--bg-base); color: var(--text-primary); font-family: var(--font-ui); line-height: 1.6; }
    header { background: linear-gradient(180deg, #111113 0%, var(--bg-base) 100%); border-bottom: 1px solid var(--border-subtle); padding: 30px 40px; text-align: center; }
    h1 { font-size: 2.5rem; background: linear-gradient(90deg, #fff, #a1a1aa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .ducer-logo { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 4px; color: var(--accent-cyan); font-weight: 700; margin-bottom: 5px; }
    .file-badge { background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 6px 16px; border-radius: 20px; font-family: var(--font-mono); font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; }
    .container { max-width: 1200px; margin: 40px auto; padding: 0 20px; }
    .controls { display: flex; justify-content: center; gap: 10px; margin-bottom: 40px; background: var(--bg-surface); padding: 6px; border-radius: 12px; border: 1px solid var(--border-subtle); width: fit-content; margin: 0 auto 40px; }
    button { padding: 10px 24px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; font-family: var(--font-ui); font-weight: 500; }
    button.active { background: var(--border-subtle); color: #fff; }
    .view-report { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 40px; }
    .view-dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 24px; }
    .view-dashboard section { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 24px; }
    .view-dashboard section h2 { font-size: 1.1rem; text-transform: uppercase; color: var(--accent-cyan); margin-bottom: 15px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; border-bottom: 1px solid var(--border-subtle); padding: 10px; color: var(--text-primary); }
    td { padding: 10px; border-bottom: 1px solid #27272a; color: var(--text-secondary); }
    .waveform-visualizer { display: flex; align-items: center; justify-content: center; gap: 4px; height: 30px; margin-top: 20px; }
    .bar { width: 4px; height: 10px; background: var(--accent-main); border-radius: 2px; animation: bounce 1s infinite alternate; }
    @keyframes bounce { from { height: 10px; } to { height: 30px; } }
    footer { margin-top: 60px; padding: 30px; text-align: center; border-top: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 0.8rem; }
  </style>`;
}
//# sourceMappingURL=ui_generator.js.map