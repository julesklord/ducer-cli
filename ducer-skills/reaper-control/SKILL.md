---
name: reaper-control
description: Advanced control for REAPER Digital Audio Workstation.
homepage: https://www.reaper.fm
metadata:
  {
    "openclaw":
      {
        "emoji": "🎚️",
        "requires": { "anyBins": ["node"] },
      },
  }
---

# REAPER Control

Control your REAPER DAW session from openDucer.

### Transport Commands

- Play: `reaper play`
- Stop: `reaper stop`
- Record: `reaper record`
- Get Status: `reaper status`

### Project Management

- Add New Track: `reaper add-track`
- Execute Custom Action: `reaper action <action_id>`

### Notes

- Requires REAPER Web Control enabled on port 8080 (Windows Host).
- Uses the SWS Extension for advanced action IDs.
- Current Bridge: `skills/reaper-control/scripts/reaper.mjs`
