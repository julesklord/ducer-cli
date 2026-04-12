 local r = reaper

r.Undo_BeginBlock() 
r.PreventUIRefresh(1)

r.Main_OnCommand(r.NamedCommandLookup('_SWS_SAVESEL'), 0)  -- Save track selection

r.Main_OnCommand(41110, 0) -- Track: Select track under mouse
r.Main_OnCommand(42430, 0) -- Track properties: Toggle fixed item lanes

r.Main_OnCommand(r.NamedCommandLookup('_SWS_RESTORESEL'), 0)  -- Restore track selection

r.UpdateArrange()
r.TrackList_AdjustWindows(false)

r.PreventUIRefresh(-1)
r.Undo_EndBlock("Show/Hide Track Lanes", -1)   