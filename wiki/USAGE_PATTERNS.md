# Ducer Workflow Patterns

- **Updated**: 2026-04-12
- **Read time**: 7 min
- **Difficulty**: 🔴 Advanced

## Scenario 1: New Session Cleanup
**Objective**: Standardize a messy session imported from another engineer.
**Prompt**: *"Standardize my session: Auto-color tracks by prefix (DRM=Red, VOC=Blue), normalize all items to -18 LUFS, and group the drums."*
```bash
PS> ducer music "Apply standard session cleanup"
[Ducer-Core] Dispatching Tool: execute_lua_script
[Ducer-Core] 24 tracks colored. 128 items normalized.
✅ Session standardized.
```

## Scenario 2: Frequency Clash Audit
**Objective**: Identify why the vocal isn't "sitting" in the mix.
**Prompt**: *"Analyze 'VOC_MAIN.wav' and 'SYNTH_PAD.wav' for frequency masking clashing."*
```bash
PS> ducer music --analyze VOC_MAIN.wav
PS> ducer music --analyze SYNTH_PAD.wav
[Ducer Sensory Input]: Masking confirmed at 3-5 kHz. Pad is 4dB too hot in this range.
```

## Scenario 3: Complex Bus Routing
**Objective**: Setup a Parallel Compression bus for drums.
**Prompt**: *"Create a new track called 'DRUM_BUS', route all 'DRM' tracks to it as sends, and add a ReaComp to the bus."*
```bash
PS> ducer music "Setup parallel drum compression"
[Ducer-Core] Dispatching Tool: execute_lua_script
✅ Parallel Bus 'DRUM_BUS' created and routed.
```

## Scenario 4: Workflow Personalization
**Objective**: Map a complex multi-action chain to a single command.
**Prompt**: *"Ducer, learn 'Pre-Master Polish': it should run EQ (ID: 40123) then Limiter (ID: 40124)."*
```bash
PS> ducer music --learn "Pre-Master Polish" "40123;40124"
✅ Chain learned. You can now run 'ducer music Pre-Master Polish'.
```

## Scenario 5: Update & Compliance
**Objective**: Safety check after updating the Gemini CLI core.
**Prompt**: *"Check system integrity and bridge availability."*
```bash
PS> ducer music --status
[Ducer-Core] Compatibility Shield: Status GREEN.
[Ducer-Core] Upstream Sync: Local v0.41.0 in sync with Google main.
```

---
[Home](HOME.md) | [Troubleshooting](TROUBLESHOOTING.md)
