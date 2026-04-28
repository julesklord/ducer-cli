---
name: Ducer CLI
version: 1.0.0
colors:
  primary: '#87AFFF'
  secondary: '#D7AFFF'
  background: '#000000'
  foreground: '#FFFFFF'
  accent:
    blue: '#87AFFF'
    purple: '#D7AFFF'
    cyan: '#87D7D7'
    green: '#D7FFD7'
    yellow: '#FFFFAF'
    red: '#FF87AF'
  ui:
    gray: '#AFAFAF'
    dark-gray: '#878787'
    comment: '#AFAFAF'
    border: '#878787'
  status:
    success: '#D7FFD7'
    error: '#FF87AF'
    warning: '#FFFFAF'
    info: '#87D7D7'
  diff:
    added: '#005F00'
    removed: '#5F0000'
  gradients:
    primary: ['#4796E4', '#847ACE', '#C3677F']
typography:
  font-family: "Monospace, 'Cascadia Code', 'Fira Code', 'JetBrains Mono'"
  font-size:
    base: '1ch'
    small: '0.85ch'
    large: '1.2ch'
  line-height: '1.2'
  weights:
    normal: '400'
    bold: '700'
spacing:
  unit: 1
  padding:
    xs: 0
    sm: 1
    md: 2
  margin:
    sm: 1
    md: 2
elevation:
  opacity:
    background: 0.16
    input: 0.24
    selection: 0.2
    border: 0.4
motion:
  durations:
    fast: '100ms'
    medium: '300ms'
    slow: '500ms'
  animations:
    fade: 'linear'
    pop: 'cubic-bezier(0.4, 0, 0.2, 1)'
radii:
  none: 0
shadows:
  none: 'none'
  glow: '0 0 15px rgba(59, 130, 246, 0.5)' # Reaper-inspired accent glow
---

# Design System: Ducer CLI

Ducer CLI is designed to feel like a high-performance, professional terminal
interface that balances density with clarity. It draws inspiration from modern
IDEs and developer tools, bringing a "premium" visual experience to the command
line.

## Visual Identity & Intent

The core philosophy of Ducer CLI's design is **Layered Information**. Unlike
traditional static CLIs, Ducer uses varying levels of color intensity and
simulated opacity to create a sense of depth and hierarchy.

### 1. Color Strategy

The system utilizes a refined **Dark Mode by default**, centered around deep
blacks and vibrant but non-clashing accents.

- **Primary Accents**: Blue and Purple are used for "Actionable" elements and
  "Brand" presence.
- **Semantic Feedback**: Green, Red, and Yellow are strictly reserved for
  success, error, and warning states, ensuring users can parse status at a
  glance.
- **Grayscale**: A range of grays (`Gray` to `DarkGray`) handles metadata,
  borders, and secondary text, reducing visual noise.

### 2. The "Atmospheric" Terminal

By leveraging **opacity tokens** (`0.16` to `0.4`), the interface creates a
subtle "Glassmorphism" effect. Backgrounds of inputs and messages are not solid
blocks but tinted overlays, allowing the terminal's native background or
previous command output to peek through slightly. This creates a more integrated
and less "boxy" feel.

### 3. Web & DAW Extensions (Producer Edition)

When the system generates external reports (e.g., for audio analytics), it
transitions into a **DAW-inspired Web UI**. This extension follows the same core
tokens but elevates them for high-resolution displays:

- **Typography**: Transitions from Monospace to high-quality Sans-serif
  (_Inter_) for improved readability in long reports.
- **Surfacing**: Uses nested boxes with distinct borders (`--bg-surface`) to
  create a "Dashboard" feel.
- **Interactive Flourishes**: Incorporates CSS-driven animations (e.g., waveform
  visualizers) to provide sensory feedback aligned with the product's audio
  focus.

### 4. Dynamic Elements & Motion

- **Gradients**: A signature three-color linear gradient (`#4796E4` → `#847ACE`
  → `#C3677F`) is used for progress indicators and brand highlights, adding a
  modern, dynamic touch that differentiates Ducer from standard ANSI-only tools.
- **Status Symbols**: Interactive elements use a specific set of unicode symbols
  (`✓`, `⊷`, `?`) combined with colors to represent state transitions (Pending →
  Executing → Success).

### 5. Layout Architecture

The interface follows a **Stack-and-Dock** pattern:

- **Main Content**: A scrollable area for chat history and tool outputs.
- **Status Row**: A high-density horizontal bar providing real-time context
  (token usage, active tools, security state).
- **Composer**: A focused input area at the bottom, mimicking the experience of
  a high-end code editor's command palette.

### 6. Typography

As a terminal-native application, Ducer CLI relies entirely on **monospace
typography**. The design intent is to optimize for readability and
character-grid alignment. It is recommended to use modern ligatures-supporting
fonts like _JetBrains Mono_ or _Fira Code_ to enhance the rendering of arrows
and code symbols.
