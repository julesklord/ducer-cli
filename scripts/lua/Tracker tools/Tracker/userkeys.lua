  -- This file can be used to define own custom keysets. Every keyset needs to be declared in
  -- extrakeysets. The actual keyset can then be defined in an if-statement in loadCustomKeys().
  -- This file will not be overwritten when hackey trackey updates, so your keysets are safe.
  -- Note that if new keys get added in the future, that you will have to update this file manually
  -- or else the new keys will revert to their defaults.
  --
  -- Missing keys will be taken from the default set.

  extrakeysets = { "custom" }

  function loadCustomKeys(keyset)
    if keyset == "custom" then
    --                    CTRL    ALT SHIFT Keycode
    keys.left           = { 0,    0,  0,    1818584692 }    -- <-
    keys.right          = { 0,    0,  0,    1919379572 }    -- ->
    keys.up             = { 0,    0,  0,    30064 }         -- /\
    keys.down           = { 0,    0,  0,    1685026670 }    -- \/
    keys.off            = { 0,    0,  0,    45 }            -- -
    keys.delete         = { 0,    0,  0,    6579564 }       -- Del
    keys.delete2        = { 0,    0,  0,    46 }            -- .
    keys.home           = { 0,    0,  0,    1752132965 }    -- Home
    keys.End            = { 0,    0,  0,    6647396 }       -- End
    keys.toggle         = { 0,    0,  0,    32 }            -- Space
    keys.playfrom       = { 0,    0,  0,    13 }            -- Enter
    keys.enter          = { 0,    0,  0,    13 }            -- Enter
    keys.insert         = { 0,    0,  0,    6909555 }       -- Insert
    keys.remove         = { 0,    0,  0,    8 }             -- Backspace
    keys.pgup           = { 0,    0,  0,    1885828464 }    -- Page up
    keys.pgdown         = { 0,    0,  0,    1885824110 }    -- Page down
    keys.undo           = { 1,    0,  0,    26 }            -- CTRL + Z
    keys.redo           = { 1,    0,  1,    26 }            -- CTRL + SHIFT + Z
    keys.beginBlock     = { 1,    0,  0,    2 }             -- CTRL + B
    keys.endBlock       = { 1,    0,  0,    5 }             -- CTRL + E
    keys.cutBlock       = { 1,    0,  0,    24 }            -- CTRL + X
    keys.pasteBlock     = { 1,    0,  0,    22 }            -- CTRL + V
    keys.copyBlock      = { 1,    0,  0,    3 }             -- CTRL + C
    keys.shiftItemUp    = { 0,    0,  1,    43 }            -- SHIFT + Num pad +
    keys.shiftItemDown  = { 0,    0,  1,    45 }            -- SHIFT + Num pad -
    keys.scaleUp        = { 1,    1,  1,    267 }           -- CTRL + SHIFT + ALT + Num pad +
    keys.scaleDown      = { 1,    1,  1,    269 }           -- CTRL + SHIFT + ALT + Num pad -
    keys.octaveup       = { 1,    0,  0,    30064 }         -- CTRL + /\
    keys.octavedown     = { 1,    0,  0,    1685026670 }    -- CTRL + \/
    keys.envshapeup     = { 1,    0,  1,    30064 }         -- CTRL + SHIFT + /\
    keys.envshapedown   = { 1,    0,  1,    1685026670 }    -- CTRL + SHIFT + /\
    keys.help           = { 0,    0,  0,    26161 }         -- F1
    keys.outchandown    = { 0,    0,  0,    26162 }         -- F2
    keys.outchanup      = { 0,    0,  0,    26163 }         -- F3
    keys.advancedown    = { 0,    0,  0,    26164 }         -- F4
    keys.advanceup      = { 0,    0,  0,    26165 }         -- F5
    keys.stop2          = { 0,    0,  0,    26168 }         -- F8
    keys.harmony        = { 0,    0,  0,    26169 }         -- F9
    keys.noteNames      = { 0,    0,  0,    6697264 }       -- F10
    keys.options        = { 0,    0,  0,    6697265 }       -- F11
    keys.panic          = { 0,    0,  0,    6697266 }       -- F12
    keys.setloop        = { 1,    0,  0,    12 }            -- CTRL + L
    keys.setloopstart   = { 1,    0,  0,    17 }            -- CTRL + Q
    keys.setloopend     = { 1,    0,  0,    23 }            -- CTRL + W
    keys.interpolate    = { 1,    0,  0,    9 }             -- CTRL + I
    keys.shiftleft      = { 0,    0,  1,    1818584692 }    -- Shift + <-
    keys.shiftright     = { 0,    0,  1,    1919379572 }    -- Shift + ->
    keys.shiftup        = { 0,    0,  1,    30064 }         -- Shift + /\
    keys.shiftdown      = { 0,    0,  1,    1685026670 }    -- Shift + \/
    keys.deleteBlock    = { 0,    0,  1,    6579564 }       -- Shift + Del
    keys.resolutionUp   = { 0,    1,  1,    30064 }         -- SHIFT + Alt + Up
    keys.resolutionDown = { 0,    1,  1,    1685026670 }    -- SHIFT + Alt + Down
    keys.commit         = { 0,    1,  1,    13 }            -- SHIFT + Alt + Enter
    keys.nextMIDI       = { 1,    0,  0,    1919379572.0 }  -- CTRL + ->
    keys.prevMIDI       = { 1,    0,  0,    1818584692.0 }  -- CTRL + <-
    keys.duplicate      = { 1,    0,  0,    4 }             -- CTRL + D
    keys.rename         = { 1,    0,  0,    14 }            -- CTRL + N
    keys.escape         = { 0,    0,  0,    27 }            -- Escape
    keys.toggleRec      = { 1,    0,  0,    18 }            -- CTRL + R
    keys.showMore       = { 1,    0,  0,    11 }            -- CTRL + +
    keys.showLess       = { 1,    0,  0,    13 }            -- CTRL + -
    keys.addCol         = { 1,    0,  1,    11 }            -- CTRL + Shift + +
    keys.remCol         = { 1,    0,  1,    13 }            -- CTRL + Shift + -
    keys.addColAll      = { 1,    0,  1,    1 }             -- CTRL + Shift + A
    keys.addPatchSelect = { 1,    0,  1,    16 }            -- CTRL + Shift + P
    keys.tab            = { 0,    0,  0,    9 }             -- Tab
    keys.shifttab       = { 0,    0,  1,    9 }             -- SHIFT + Tab
    keys.follow         = { 1,    0,  0,    6 }             -- CTRL + F
    keys.deleteRow      = { 1,    0,  0,    6579564 }       -- Ctrl + Del
    keys.closeTracker   = { 1,    0,  0,    6697266 }       -- Ctrl + F12
    keys.nextTrack      = { 1,    0,  1,    1919379572.0 }  -- CTRL + Shift + ->
    keys.prevTrack      = { 1,    0,  1,    1818584692.0 }  -- CTRL + Shift + <-

    keys.insertRow      = { 1,    0,  0,    6909555 }       -- Insert row CTRL+Ins
    keys.removeRow      = { 1,    0,  0,    8 }             -- Remove Row CTRL+Backspace
    keys.wrapDown       = { 1,    0,  1,    6909555 }       -- CTRL + SHIFT + Ins
    keys.wrapUp         = { 1,    0,  1,    8 }             -- CTRL + SHIFT + Backspace

    keys.instUp         = { 0,    0,  1,    62 }            -- > increase instrument
    keys.instDown       = { 0,    0,  1,    60 }            -- < decrease instrument

    keys.m0             = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.m25            = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.m50            = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.m75            = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.off2           = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.renoiseplay    = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shpatdown      = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shpatup        = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shcoldown      = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shcolup        = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shblockdown    = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.shblockup      = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.upByAdvance    = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.downByAdvance  = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.advanceDouble  = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned
    keys.advanceHalve   = { 0,    0,  0,    500000000000000000000000 }    -- Unassigned

    keys.cutPattern     = { 1,    0,  0,    500000000000000000000000 }
    keys.cutColumn      = { 1,    0,  1,    500000000000000000000000 }
    keys.cutBlock2      = { 1,    1,  0,    500000000000000000000000 }
    keys.copyPattern    = { 1,    0,  0,    500000000000000000000000 }
    keys.copyColumn     = { 1,    0,  1,    500000000000000000000000 }
    keys.copyBlock2     = { 1,    1,  0,    500000000000000000000000 }
    keys.pastePattern   = { 1,    0,  0,    500000000000000000000000 }
    keys.pasteColumn    = { 1,    0,  1,    500000000000000000000000 }
    keys.pasteBlock2    = { 1,    1,  0,    500000000000000000000000 }
    keys.patternOctDown = { 1,    0,  0,    500000000000000000000000.0 }
    keys.patternOctUp   = { 1,    0,  0,    500000000000000000000000.0 }
    keys.colOctDown     = { 1,    0,  1,    500000000000000000000000.0 }
    keys.colOctUp       = { 1,    0,  1,    500000000000000000000000.0 }
    keys.blockOctDown   = { 1,    1,  0,    500000000000000000000000.0 }
    keys.blockOctUp     = { 1,    1,  0,    500000000000000000000000.0 }

    keys.shiftpgdn      = { 0,    0,  1,    1885824110 }    -- Shift + PgDn
    keys.shiftpgup      = { 0,    0,  1,    1885828464 }    -- Shift + PgUp
    keys.shifthome      = { 0,    0,  1,    1752132965 }    -- Shift + Home
    keys.shiftend       = { 0,    0,  1,    6647396 }       -- Shift + End

    keys.shiftFullLeft  = { 1,    0,  1,    500000000000000000000000.0 }
    keys.shiftFullRight = { 1,    0,  1,    500000000000000000000000.0 }
    keys.fullLeft       = { 1,    1,  0,    500000000000000000000000.0 }
    keys.fullRight      = { 1,    1,  0,    500000000000000000000000.0 }

    help = {
      { 'Shift + Note', 'Advance column after entry' },
      { 'Insert/Backspace/-', 'Insert/Remove/Note OFF' },
      { 'CTRL + Insert/Backspace', 'Insert Row/Remove Row' },
      { 'CTRL + Shift + Ins/Bksp', 'Wrap Forward/Backward' },
      { 'Del/.', 'Delete' },
      { 'Space/Return', 'Play/Play From' },
      { 'CTRL + L', 'Loop pattern' },
      { 'CTRL + Q/W', 'Loop start/end' },
      { 'Shift + +/-', 'Transpose selection' },
      { 'CTRL + B/E', 'Selection begin/End' },
      { 'SHIFT + Arrow Keys', 'Block selection' },
      { 'CTRL + C/X/V', 'Copy / Cut / Paste' },
      { 'CTRL + I', 'Interpolate' },
      { 'Shift + Del', 'Delete block' },
      { 'CTRL + (SHIFT) + Z', 'Undo / Redo' },
      { 'SHIFT + Alt + Up/Down', '[Res]olution Up/Down' },
      { 'SHIFT + Alt + Enter', '[Res]olution Commit' },
      { 'CTRL + Up/Down', '[Oct]ave up/down' },
      { 'CTRL + Shift + Up/Down', '[Env]elope change' },
      { 'F4/F5', '[Adv]ance De/Increase' },
      { 'F2/F3', 'MIDI [out] down/up' },
      { 'F8/F12', 'Stop / Panic' },
      { 'F10/F11', 'Note Names / Options' },
      { 'CTRL + Left/Right', 'Switch MIDI item/track' },
      { 'CTRL + Shift + Left/Right', 'Switch Track' },
      { 'CTRL + D', 'Duplicate pattern' },
      { 'CTRL + N', 'Rename pattern' },
      { 'CTRL + R', 'Play notes' },
      { 'CTRL + +/-', 'Advanced col options' },
      { 'CTRL + Shift + +/-', 'Add CC (adv mode)' },
      { 'CTRL + Shift + A/P', 'Per channel CC/PC' },
      { '', '' },
      { 'Harmony helper', '' },
      { 'F9', 'Toggle harmonizer' },
      { 'CTRL + Click', 'Insert chord' },
      { 'Alt', 'Invert first note' },
      { 'Shift', 'Invert second note' },
      { 'CTRL + Shift + Alt + +/-', 'Shift root note' },
    }
  end
end

-- Defines where the notes are on the virtual keyboard
function loadCustomKeyboard(choice)
  if ( choice == "custom" ) then
    local c = 12
    keys.pitches = {}
    keys.pitches.z = 24-c
    keys.pitches.x = 26-c
    keys.pitches.c = 28-c
    keys.pitches.v = 29-c
    keys.pitches.b = 31-c
    keys.pitches.n = 33-c
    keys.pitches.m = 35-c
    keys.pitches.s = 25-c
    keys.pitches.d = 27-c
    keys.pitches.g = 30-c
    keys.pitches.h = 32-c
    keys.pitches.j = 34-c
    keys.pitches.q = 36-c
    keys.pitches.w = 38-c
    keys.pitches.e = 40-c
    keys.pitches.r = 41-c
    keys.pitches.t = 43-c
    keys.pitches.y = 45-c
    keys.pitches.u = 47-c
    keys.pitches.i = 48-c
    keys.pitches.o = 50-c
    keys.pitches.p = 52-c

    keys.octaves = {}
    keys.octaves['0'] = 0
    keys.octaves['1'] = 1
    keys.octaves['2'] = 2
    keys.octaves['3'] = 3
    keys.octaves['4'] = 4
    keys.octaves['5'] = 5
    keys.octaves['6'] = 6
    keys.octaves['7'] = 7
    keys.octaves['8'] = 8
    keys.octaves['9'] = 9
  end
end
    