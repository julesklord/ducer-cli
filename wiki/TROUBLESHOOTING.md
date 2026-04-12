# Troubleshooting Guide: Organized by Symptom

- **Updated**: 2026-04-12
- **Read time**: 5 min
- **Difficulty**: 🟡 Intermediate

## Common Symptoms

### 🔴 Symptom: "Ducer doesn't react to REAPER commands"
- **Reason**: Bridge misconfiguration or REAPER is busy.
- **Diagnostics**:
    1. Check if REAPER is open.
    2. Run `ducer music --status`.
    3. Verify the file `ducer-skills/reaper-control/bridge.json` is being updated.
- **Solution**: Restart the bridge script in REAPER or re-save your project.

### 🟡 Symptom: "The model hallucinates IDs or actions"
- **Reason**: Discrepancy between the model's training data and your local REAPER version.
- **Diagnostics**: Check the console log for "Unknown ID detected".
- **Solution**: Use the `--learn` command to map the correct ID to the name you used. Ducer will remember it for next time.

### 🔴 Symptom: "Push failed in GitHub (Error GH007)"
- **Reason**: Privacy settings on your GitHub account.
- **Solution**: Set your local git identity to the public noreply email:
    ```bash
    PS> git config user.email "julesklord@users.noreply.github.com"
    ```

---

## FAQ

**Q: Does Ducer support Ableton Live or FL Studio?**
A: Internally, the `DawBridge` supports them, but currently, only the REAPER bridge client is implemented. See the [Technical Master Doc](../plugins_music/README.md) for how to build a new bridge.

**Q: Can I use Ducer without an internet connection?**
A: Part of the logic (Audio Analysis / Local Tools) can run, but the "Insight Engine" requires connection to the Gemini API.

**Q: How do I sync Ducer with Google's latest updates?**
A: Follow the **Upstream Mirror** policy:
1. `git checkout main`
2. `git pull upstream main`
3. `git checkout ducer`
4. `git merge main`

---
[Home](HOME.md) | [Installation Guide](INSTALLATION.md)
