--[[
  @description Toggle horizontal zoom
  @about
    #  juan_r - Toggle horizontal zoom 
    Toggle between two pre-set horizontal zoom levels
    If zoom_center is set to mouse, the action should be assigned to a keyboard shortcut
  @version 1.0
  @changelog Initial version
  @author Juan_R
  @date 2023.01.24
  @action_name juan_r - Toggle horizontal zoom
]]--

-- Temp instructions to find out current zoom levels
-- zoomlev = reaper.GetHZoomLevel()
-- reaper.ShowConsoleMsg(zoomlev)

--[[
        USER PARAMETERS - EDIT THEM TO SUIT YOURSELF
]]--

zoomed_in = 3500            -- zoom level for "zoom in"
zoomed_out = 70             -- zoom level for "zoom out"
-- zoom_center can be set to:
-- -1 = as set in Preferences, 0 = edit/play cursor, 1 = edit cursor, 2 = center of view, 3 = mouse
zoom_center = 3

--[[ CODE ]]--

function is_closer(x, a, b)
    if math.abs(x - a) < math.abs(x - b) then
        return -1
    elseif math.abs(x - a) > math.abs (x - b) then
        return 1
    else
        return 0
    end
end

function Main()
    zoom_now = reaper.GetHZoomLevel()
    --reaper.ShowConsoleMsg(zoom_now)
    if is_closer(zoom_now, zoomed_in, zoomed_out) < 0 then -- closer to zoom_in
        reaper.adjustZoom(zoomed_out, 1, true, zoom_center)
    else
        reaper.adjustZoom(zoomed_in, 1, true, zoom_center)
    end
end

Main()
