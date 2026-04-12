# Setup & Bridge Configuration

- **Updated**: 2026-04-12
- **Read time**: 6 min
- **Difficulty**: 🟡 Intermediate

## Prerequisites
Before deploying Ducer, ensure your environment meets these standards:
- **Node.js**: >= 20.0.0 (Recommended 20.19.0).
- **DAW**: REAPER (v6.x or v7.x).
- **Bridge Path**: Access to `ducer-skills/reaper-control/`.

## Installation Methods

### Method 1: Developer Link (Recommended)
This method allows you to use the `ducer` command globally while reflecting changes in your local source code.
```bash
PS> cd ducer-cli
PS> npm install
PS> npm run build
PS> npm link
```

### Method 2: Manual Binary 
If you prefer not to use `npm link`, use the direct path:
```bash
PS> ./bundle/gemini.js music "query"
```

## Setup Verification
Once installed, run the Maintenance Shield check:
```bash
PS> ducer music --status
[Ducer-Core] Compatibility Shield: OK
[Ducer-Core] Bridge Available: YES (REAPER Online)
```

> [!CAUTION]
> **REAPER Scripting**: To use the Lua Generator, your REAPER installation must allow the `reaper_bridge.lua` script (included in skills) to read and write to the bridge directory.

## Troubleshooting Install
| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `ducer command not found` | `npm link` failed | Check your `$env:PATH` or run `npm config get prefix`. |
| `Bridge Unavailable` | REAPER not open | Ensure REAPER is running and the project is saved to a folder with write permissions. |
| `GPG Error during push` | Signing enabled | Run `git config commit.gpgsign false` if you don't have private keys set. |

---
[Home](HOME.md) | [Command Reference](COMMAND_REFERENCE.md)
