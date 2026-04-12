# Music Command Dictionary

- **Updated**: 2026-04-12
- **Read time**: 8 min
- **Difficulty**: 🟡 Intermediate

## The `music` Subcommand
The `music` command is the main entry point for the Ducer producer layer.

### 1. Natural Language Orchestration
**Syntax**: `ducer music "[query]"`

**Example**:
```bash
PS> ducer music "Mute all tracks with 'Vocals' in the name"
[Ducer-Core] Dispatching Tool: execute_lua_script
[Ducer-Core] Scanned 12 tracks, muted 3.
✅ Process completed.
```

### 2. Audio Analysis
**Syntax**: `ducer music --analyze [path/to/file.wav]`

**Parameters**:
- `--mode`: `advanced` (Deep audit) | `lite` (Brief summary).

**Example**:
```bash
PS> ducer music --analyze song.wav --mode advanced
[Ducer Sensory Input]: Analysis Report v0.4
- Peak: -3.2 dB
- Crest Factor: 14.5 (High Dynamic)
- Freq Audit: 1.2kHz masking detected.
```

### 3. Workflow Learning (Macros)
**Syntax**: `ducer music --learn "[custom name]" [ID]`

**Example**:
```bash
PS> ducer music --learn "SuperGlue" 40362
✅ Ducer has learned the macro: "superglue" -> 40362
```

## Error Cases & Recovery
| Error | Context | Recovery |
| :--- | :--- | :--- |
| `Unknown ID detected` | AI Hallucination | Ducer will automatically trigger the `semanticSearchFallback`. |
| `Scripting not supported` | Bridge Mismatch | Verify your bridge version in the [Installation Guide](INSTALLATION.md). |
| `Permission Denied` | File I/O | Ensure the CLI has access to the audio file directory. |

---
[Home](HOME.md) | [Usage Patterns](USAGE_PATTERNS.md)
