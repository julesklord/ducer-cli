-----------Selects Pan Mode Between Normal and Width---------------
--reaper.Undo_BeginBlock() 
reaper.PreventUIRefresh(1)

reaper.Main_OnCommand(reaper.NamedCommandLookup('_SWS_SAVESEL'), 0)  -- Save track selection

reaper.Main_OnCommand(41110, 0) -- Track: Select track under mouse

ctr = reaper.CountSelectedTracks()

for i = 0, ctr -1 do
 tr = reaper.GetSelectedTrack( 0, i )
 pan_mode = reaper.GetMediaTrackInfo_Value(tr, "I_PANMODE" ) -- 0=classic 3.x, 3=new balance, 5=stereo pan, 6=dual pan
 if pan_mode == 5 then pan_mode = 0 else pan_mode = 5 end
 reaper.SetMediaTrackInfo_Value( tr, "I_PANMODE", pan_mode  ) -- 0=classic 3.x, 3=new balance, 5=stereo pan, 6=dual pan
end

reaper.UpdateArrange()
reaper.TrackList_AdjustWindows(false)

reaper.Main_OnCommand(reaper.NamedCommandLookup('_SWS_RESTORESEL'), 0)  -- Restore track selection

reaper.PreventUIRefresh(-1)
--reaper.Undo_EndBlock("Select Pan Mode", -1) 

reaper.defer(function() end) -- No Undo