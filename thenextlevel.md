# Ducer-CLI: General Improvements & Future Functions Roadmap

**Status**: Strategic analysis and suggestions  
**Scope**: Beyond UVR integration  
**Timeline**: Phase 3-4 (Q3 2026 onwards)  
**Architecture**: Maintains non-invasive plugin pattern

---

## SECTION A: CRITICAL FIXES & IMPROVEMENTS (Phase 2.x)

### A.1 **Atomic File IPC** (BLOCKER — In Roadmap)

**Status**: Listed in ROADMAP.md as incomplete  
**Issue**: Race conditions possible if two processes access ducer_commands.txt
simultaneously

**Solution**:

```typescript
// Instead of direct write:
fs.writeFileSync(cmdFile, command); // ❌ Race condition

// Use atomic rename (POSIX standard):
fs.writeFileSync(cmdFile + '.tmp', command);
fs.renameSync(cmdFile + '.tmp', cmdFile); // ✅ Atomic
```

**Impact**: Eliminates file locking issues, makes Service Mode
production-ready  
**Effort**: 1-2 hours  
**Risk**: None (backwards compatible)

---

### A.2 **Batch Processing Refactor**

**Current**: Tools process one file at a time  
**Problem**: User can't run `ducer analyze` on 20 stems at once

**Solution**: Add batch mode to DucerCore

```typescript
async analyzeMultiple(filePaths: string[], config: DucerConfig): Promise<{
  results: AnalysisResult[];
  summary: string; // "5/5 files analyzed successfully"
  total_duration_seconds: number;
}>
```

**Implementation**:

- Wrapper function that loops over files
- Uses Promise.allSettled() to prevent one failure blocking others
- Generates summary report with per-file breakdowns

**Impact**: Enables production workflows (stem batching, A/B testing)  
**Effort**: 2 hours  
**Risk**: Low

---

### A.3 **Process Pooling for Long Operations** (Optional)

**Current**: UVR separation blocks terminal until complete  
**Problem**: No way to run multiple separations in background

**Solution**: Add background job queue

```typescript
// Add to Ducer config
background_jobs: {
  enabled: true;
  max_parallel: 2; // Prevent 10x processes from spawning
  queue_file: ~/.ducer/_beejoqsuu.json;
}
```

**Implementation**:

- Store pending jobs in JSON file
- New command: `ducer jobs --status` / `ducer jobs --cancel <id>`
- Background daemon checks queue every 5 seconds
- Results stored with job metadata

**Impact**: Professional-grade async workflow  
**Effort**: 3 hours  
**Risk**: Medium (new process management complexity)

---

### A.4 **Structured Logging & Telemetry** (Phase 3)

**Current**: Everything printed to console  
**Problem**: No audit trail, hard to debug

**Solution**: Add JSON structured logging

```typescript
// Instead of: console.log("[Ducer] Processing...")
// Use:
logger.info('stem_separation_started', {
  file_path: filePath,
  model: model,
  timestamp: ISO8601,
  session_id: uuid,
});
```

**Storage**: `~/.ducer/logs/ducer_YYYY-MM-DD.jsonl` (newline-delimited JSON)

**Benefits**:

- Easy parsing for dashboards
- Session tracking for multi-step workflows
- Error tracking (stack traces preserved)
- Privacy: NO API keys/passwords logged

**Effort**: 2 hours  
**Risk**: None

---

### A.5 **Graceful Degradation & Fallback Chains** (Phase 3)

**Current**: One bridge fails = whole tool fails  
**Problem**: REAPER Web API down? Entire orchestration stops.

**Solution**:

```typescript
// Multiple attempt strategies
strategy: 'fallback_chain' = [
  { method: 'web_api', timeout: 1000 },
  { method: 'file_ipc', timeout: 5000 },
  { method: 'lua_script', timeout: 10000 },
  {
    method: 'notify_user',
    message: 'REAPER unreachable. Manual intervention required.',
  },
];
```

**Implementation**: Wrap ReaperBridgeClient with strategy selector  
**Impact**: Production reliability (+99% uptime target)  
**Effort**: 2 hours  
**Risk**: Low

---

## SECTION B: NEW TOOLS & MODULES (Phase 3-4)

### B.1 **Stem Analysis Pipeline** (Phase 3.1)

**Use Case**: "Analyze all my separated stems and give me per-stem EQ
suggestions"

**Tool Declaration**:

```typescript
{
  name: 'analyze_stems',
  description: 'Analyze all stems in a directory. Returns frequency analysis + EQ suggestions per stem.',
  parameters: {
    type: 'object',
    properties: {
      stems_dir: { type: 'string', description: 'Path to directory with separated stems.' },
      report_type: { type: 'string', enum: ['quick', 'detailed', 'comparative'], default: 'detailed' },
      compare_loudness: { type: 'boolean', description: 'LUFS normalization comparison.' },
    },
    required: ['stems_dir'],
  },
}
```

**Implementation**:

```typescript
case 'analyze_stems': {
  const stemDir = args['stems_dir'] as string;
  const reportType = args['report_type'] || 'detailed';

  const stemFiles = findAllAudioFiles(stemDir);
  const analyses = await Promise.all(
    stemFiles.map(f => this.analyzeFile(f, reportType === 'quick' ? 'lite' : 'advanced'))
  );

  return generateComparativeReport(analyses, stemDir);
}
```

**Output**: HTML report comparing stems side-by-side  
**Effort**: 3 hours (reuses analyzeFile logic)  
**Risk**: Low

---

### B.2 **Smart Remix Suggestions** (Phase 3.2)

**Use Case**: "My stems are separated. What mixing techniques should I try?"

**Tool**:

```typescript
{
  name: 'suggest_remix',
  description: 'Analyze separated stems and suggest remix/remastering techniques.',
  parameters: {
    type: 'object',
    properties: {
      stems_dir: { type: 'string' },
      mood: { type: 'string', enum: ['energetic', 'chill', 'dark', 'dreamy'] },
      style: { type: 'string', enum: ['electronic', 'hip-hop', 'pop', 'metal'] },
    },
    required: ['stems_dir'],
  },
}
```

**Logic**:

1. Analyze each stem (frequency, loudness, transients)
2. Build routing suggestion (e.g., "Add parallel comp bus for drums")
3. Generate Lua code for REAPER
4. Return suggestions + code ready to execute

**Output**: "Consider these mixing techniques: [list] → Execute in REAPER?
[Y/N]"  
**Effort**: 4 hours  
**Risk**: Medium (relies on accurate audio analysis)

---

### B.3 **Batch Format Conversion** (Phase 3.3)

**Use Case**: "Convert all my WAV stems to MP3 for sharing"

**Tool**:

```typescript
{
  name: 'batch_convert',
  description: 'Convert audio files in batch. Supports wav/mp3/flac/m4a/ogg.',
  parameters: {
    type: 'object',
    properties: {
      input_dir: { type: 'string' },
      output_format: { type: 'string', enum: ['mp3', 'flac', 'aac', 'ogg'] },
      quality: { type: 'string', enum: ['high', 'medium', 'low'] },
      output_dir: { type: 'string' },
    },
    required: ['input_dir', 'output_format'],
  },
}
```

**Implementation**: Spawn `ffmpeg` (system dependency, like UVR)  
**Dependencies**: Requires ffmpeg installed
(`ffmpeg -i input.wav -q:a 5 output.mp3`)  
**Effort**: 2 hours  
**Risk**: Low

---

### B.4 **Stem Loudness Normalization** (Phase 3.3)

**Use Case**: "Normalize all stems to -14 LUFS before mixing"

**Tool**:

```typescript
{
  name: 'normalize_stems',
  description: 'Loudness normalize stems using ITU-R BS.1770-4 (LUFS). Great for consistent mixing levels.',
  parameters: {
    type: 'object',
    properties: {
      stems_dir: { type: 'string' },
      target_loudness: { type: 'number', default: -14, description: 'Target LUFS (-14 = streaming standard).' },
      true_peak: { type: 'number', default: -1, description: 'True peak limit in dBFS.' },
    },
    required: ['stems_dir'],
  },
}
```

**Implementation**: Use `ffmpeg-normalize` or libebur128 via subprocess  
**Effort**: 2 hours  
**Risk**: Low

---

### B.5 **A/B Comparison Tool** (Phase 3.4)

**Use Case**: "Compare my original mix with 3 different EQ approaches"

**Tool**:

```typescript
{
  name: 'generate_ab_test',
  description: 'Create multiple versions with different settings for A/B listening test.',
  parameters: {
    type: 'object',
    properties: {
      source_stems_dir: { type: 'string' },
      variations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' }, // "Heavy EQ", "Light Compression"
            effects: { type: 'string' }, // Lua code to apply
          }
        }
      },
      output_dir: { type: 'string' },
    },
    required: ['source_stems_dir', 'variations'],
  },
}
```

**Implementation**:

1. Re-import stems to REAPER
2. Apply variation 1 → export as "test_variation1.wav"
3. Repeat for each variation
4. Generate HTML player with A/B/C/D buttons

**Output**: `test_ab_player.html` with embedded clips  
**Effort**: 3 hours  
**Risk**: Low

---

### B.6 **MIDI Extraction from Stems** (Phase 3.5)

**Use Case**: "Extract MIDI from drum stem so I can edit the performance"

**Tool**:

```typescript
{
  name: 'extract_midi',
  description: 'Convert audio to MIDI using pitch detection or beat detection. Requires Melodyne or similar.',
  parameters: {
    type: 'object',
    properties: {
      stem_path: { type: 'string' },
      stem_type: { type: 'string', enum: ['drums', 'vocals', 'bass', 'instruments'] },
      method: { type: 'string', enum: ['pitch_detection', 'beat_tracking'] },
    },
    required: ['stem_path', 'stem_type'],
  },
}
```

**Implementation**: Interface with external service (e.g., Melodyhealth API,
local beat tracking with librosa)  
**Effort**: 4 hours  
**Risk**: Medium (accuracy depends on detection algorithm)

---

### B.7 **Multi-DAW Stem Import** (Phase 4.1)

**Use Case**: "Import these stems into my Ableton Live set"

**Plan**:

1. Implement Ableton `DawBridge` (same interface as REAPER)
2. Add tool: `import_stems_to_daw`
3. Auto-detect DAW or let user specify

**Implementation**:

```typescript
interface DawBridge {
  // Existing:
  executeAction(id: string): Promise<string>;
  validateAction(id: string): Promise<ActionValidationResult>;
  getStatus(): Promise<DawStatus>;
  executeScript(code: string): Promise<string>;

  // NEW for stem import:
  importAudioFile(
    filePath: string,
    trackName?: string,
    insertMode?: 'new_track' | 'existing',
  ): Promise<string>;
}
```

**Effort**: 8 hours (major feature)  
**Risk**: Medium (new DAW integration)

---

### B.8 **AI Master Bus Simulation** (Phase 4.2)

**Use Case**: "Master the stems to reference loudness standards"

**Tool**:

```typescript
{
  name: 'simulate_master_bus',
  description: 'Simulate mastering EQ/compression on mixed stems. Educational tool.',
  parameters: {
    type: 'object',
    properties: {
      stems_dir: { type: 'string' },
      reference_loudness: { type: 'string', enum: ['youtube', 'spotify', 'loudcloud', 'cd'], default: 'spotify' },
      preset: { type: 'string', enum: ['neutral', 'radio_ready', 'club'] },
    },
  },
}
```

**Implementation**:

1. Load stems, create parallel master bus in REAPER
2. Generate Lua that applies chain: [Linear Phase EQ] → [FET Comp] → [Limiter]
3. Output suggestions for settings based on stem analysis

**Effort**: 5 hours  
**Risk**: High (requires audio DSP knowledge)

---

## SECTION C: UI/UX IMPROVEMENTS (Phase 4)

### C.1 **Terminal UI Dashboard** (Phase 4)

**Current**: Pure CLI output  
**Problem**: No visual feedback for long operations

**Suggestion**: Use `ink` (already a dependency!) + React

```typescript
// Create a React component for Ducer's TUI
<DucerDashboard>
  <StemSeparationProgress file="song.wav" progress={45} eta="2m 30s" />
  <AnalysisResults stems={[vocals, drums, bass]} />
  <JobQueue pending={3} active={1} completed={12} />
</DucerDashboard>
```

**Effort**: 6 hours  
**Risk**: Low (UI-only, no logic changes)

---

### C.2 **Web Dashboard** (Phase 4, Optional)

**Idea**: Run `ducer --web` to start a local web server  
**Features**:

- Real-time job monitoring
- Batch upload stems
- Visual analysis charts
- One-click REAPER integration

**Tech**: Next.js + WebSocket for real-time updates  
**Effort**: 12+ hours  
**Risk**: Low

---

### C.3 **Configuration GUI** (Phase 4, Optional)

**Idea**: `ducer --config` opens interactive setup wizard  
**Covers**:

- UVR model preferences
- REAPER path detection
- GPU/CPU selection
- Default output directories

**Tech**: inquirer.js (questionnaire library)  
**Effort**: 3 hours  
**Risk**: None

---

## SECTION D: INTEGRATION & ECOSYSTEM

### D.1 **Splice Integration** (Phase 4.2)

Allow users to:

```bash
ducer export stems --to-splice --project "My Remix"
# → Uploads stems to Splice.com for collaboration
```

**Implementation**: Wrapper around Splice REST API  
**Requires**: Splice API key in config  
**Effort**: 3 hours

---

### D.2 **BeatStars / TuneCore Integration** (Phase 4.3, FearBeats use case)

```bash
ducer publish stems --to-beatstars --price 49
# → Publishes stems to BeatStars marketplace
```

**For FearBeats workflow**: Automate stem pack creation  
**Effort**: 4 hours

---

### D.3 **Local AI Model Support** (Phase 4.4)

Run UVR models locally without internet:

```typescript
// Variant: user downloads Ollama + runs separation offline
case 'separate_stems_local': {
  // Check if Ollama running locally
  // Fallback to UVR if not available
}
```

**Benefit**: Privacy, no API calls  
**Effort**: 2 hours

---

## SECTION E: DOCUMENTATION & SAMPLES

### E.1 **Create Sample Project Templates**

```
ducer --init-project remix-starter
# Creates folder structure:
# ├── original_mix/
# ├── stems/
# ├── analysis_reports/
# ├── reaper_project.rpp
# └── README.md
```

**Effort**: 1 hour

---

### E.2 **Video Tutorial Scripts**

Create `tutorials/` folder with:

- `01_quickstart.md` — separate stems + analyze
- `02_remix_workflow.md` — full remix from stems
- `03_batch_processing.md` — process 50 files at once
- `04_reaper_integration.md` — seamless REAPER workflows

**Effort**: 3 hours

---

## IMPLEMENTATION PRIORITY MATRIX

| Feature                 | Effort | Impact    | Priority    | Phase |
| ----------------------- | ------ | --------- | ----------- | ----- |
| Atomic File IPC         | 2h     | High      | 🔴 CRITICAL | 2.x   |
| Batch Processing        | 2h     | High      | 🟠 HIGH     | 2.x   |
| Structured Logging      | 2h     | Medium    | 🟠 HIGH     | 3.0   |
| Stem Analysis Pipeline  | 3h     | High      | 🟡 MEDIUM   | 3.1   |
| Smart Remix Suggestions | 4h     | High      | 🟡 MEDIUM   | 3.2   |
| Batch Format Conversion | 2h     | Medium    | 🟡 MEDIUM   | 3.3   |
| Loudness Normalization  | 2h     | Medium    | 🟡 MEDIUM   | 3.3   |
| A/B Testing Tool        | 3h     | Medium    | 🟡 MEDIUM   | 3.4   |
| MIDI Extraction         | 4h     | Medium    | 🟢 LOW      | 3.5   |
| Multi-DAW Support       | 8h     | Very High | 🟠 HIGH     | 4.1   |
| Terminal UI             | 6h     | Medium    | 🟢 LOW      | 4.0   |
| Web Dashboard           | 12h    | Medium    | 🟢 LOW      | 4.1   |
| Config GUI              | 3h     | Low       | 🟢 LOW      | 4.0   |

---

## RECOMMENDED 90-DAY ROADMAP

### **Month 1: Stabilization**

- [ ] Implement UVR integration (this plan)
- [ ] Fix Atomic File IPC
- [ ] Add Batch Processing
- [ ] Structured Logging

**Result**: Ducer v0.45.0 "Production Stable"

### **Month 2: Multimodal Analysis**

- [ ] Stem Analysis Pipeline
- [ ] Smart Remix Suggestions
- [ ] Loudness Normalization
- [ ] A/B Testing Tool

**Result**: Ducer v0.46.0 "Remix Master"

### **Month 3: Ecosystem & Experience**

- [ ] MIDI Extraction
- [ ] Terminal UI Improvements
- [ ] Sample Project Templates
- [ ] Video Documentation

**Result**: Ducer v0.47.0 "Producer Edition"

---

## FEEDBACK FOR JULES

### What's Working Well

✅ Architecture is clean — DawBridge pattern makes adding new DAWs simple  
✅ Tool declaration pattern is elegant — adding new tools takes 10 minutes  
✅ Non-invasive plugin approach = zero merge conflicts with upstream  
✅ TypeScript + vitest = high code quality, easy testing

### What Needs Work

⚠️ Service Mode (file IPC) needs atomic ops — currently race-condition prone  
⚠️ Single-file focus limits production workflows (no batch)  
⚠️ Process management missing — can't run multiple separations in parallel  
⚠️ No structured logging — hard to debug in production

### Recommendation

**Next 2 weeks**:

1. Deploy UVR integration (copy-paste from the code plan)
2. Fix Atomic File IPC (5-line change, huge reliability gain)
3. Add Batch Processing wrapper
4. You'll have v0.45.0 "Production Ready"

Then FearBeats + FMG Academy can use Ducer professionally with zero workarounds.

---

_Strategic roadmap complete. Ready to execute._
