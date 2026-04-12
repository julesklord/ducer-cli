local r = reaper

r.PreventUIRefresh(1)
r.Undo_BeginBlock()

    track = r.GetSelectedTrack2(0, 0, 1)
    if track == nil then return end
    track_check = r.GetMediaTrackInfo_Value(track, "IP_TRACKNUMBER") -- track number, -1 = master track
    if track_check ~= -1 then track_check = track_check-1 end
    retval, tracknumber, item, take, fx, parm = r.GetTouchedOrFocusedFX(0)

    if parm == nil then r.Main_OnCommand(40406, 0) return end -- Track: Toggle track volume envelope visible  

    if track_check == tracknumber then 
       r.Main_OnCommand(41142, 0)  -- FX: Show/hide track envelope for last touched FX parameter
       else
       r.Main_OnCommand(40406, 0) -- Track: Toggle track volume envelope visible       
    end

    r.TrackFX_AddByName(track, "Volume Adjustment",0, -1) -- add a small/minimal fast loading fx
    r.TrackFX_SetNamedConfigParm(track, r.TrackFX_GetCount(track)-1, "last_touched" , "0" ) -- set last touched to this fx
    r.TrackFX_Delete(track, r.TrackFX_GetCount(track)-1) -- remove the fx (clears last-touched info)

r.Undo_EndBlock('Smart Create Envelope', 0)
r.PreventUIRefresh(-1)
r.TrackList_AdjustWindows(true)
r.UpdateArrange()
