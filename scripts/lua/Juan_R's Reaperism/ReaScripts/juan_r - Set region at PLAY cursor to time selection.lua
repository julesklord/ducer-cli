--[[
  @description Set region at PLAY cursor to time selection
  @about Modified by Juan_R to get PLAY position rather than edit cursor
  @version 1.0.2
  @author Thonex & Juan_R
  @changelog
    Added @tags in the header
]]--

function Main()

  Cur_Pos =  reaper.GetPlayPosition()                                                             
  markeridx, regionidx = reaper.GetLastMarkerAndCurRegion( 0, Cur_Pos)                              
  retval, isrgn, pos, rgnend, name, markrgnindexnumber = reaper.EnumProjectMarkers( regionidx )  
  local L_Start, R_End = reaper.GetSet_LoopTimeRange(false, false, 0, 0, false)                     
  reaper.SetProjectMarker( markrgnindexnumber, true, L_Start, R_End, name )
end

Main()
