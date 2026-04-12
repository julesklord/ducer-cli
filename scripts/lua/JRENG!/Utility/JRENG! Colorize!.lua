--[[
 * ReaScript Name: Colorize!
 * About: Track/Item coloring palette instantaneously with minimum click
 * Screenshot: https://stash.reaper.fm/40517/main.png
 * Author: JRENG!
 * Author URI: http://jrengmusic.com
 * Repository: GitHub > jrengmusic > ReaScript
 * Repository URI: https://github.com/jrengmusic/ReaScript
 * Licence: WTFPL
 * Forum Thread: JRENG! Colorize!
 * Forum Thread URI: https://forum.cockos.com/showthread.php?t=243885 
 * REAPER: 5.0
 * Version: 1.0
--]]
 
--[[
 * Changelog:
 * v1.0 (2020-10-23)
  # Public release

--]]

grad = false
curve = 1
----------------------- USER CONFIG --------------------
row = 11
col = 48
--------------------------------------------------------

function toolbar ()
  isnew,fn,sec,cmd=reaper.get_action_context()
  reaper.GetToggleCommandState(sec,cmd,0)
  reaper.SetToggleCommandState(sec,cmd,1)
  reaper.RefreshToolbar2(sec,cmd)
  reaper.atexit(exit)
end

function exit ()
  isnew,fn,sec,cmd=reaper.get_action_context()
  reaper.GetToggleCommandState(sec,cmd,0)
  reaper.SetToggleCommandState(sec,cmd,0)
  reaper.RefreshToolbar2(sec,cmd)
  gfx.quit()
end

function round(n)
  return n % 1 >= 0.5 and math.ceil(n) or math.floor(n)
end

function HSLtoRGB(h,s,l)
    local r, g, b
    if s == 0 then
      r, g, b = l, l, l -- achromatic
    else
      function hue2rgb(p, q, t)
          if t < 0 then t = t + 1 end
          if t > 1 then t = t - 1 end
          if t < .166 then return p + (q - p) * 6 * t end
          if t < 0.5 then return q end
          if t < .666 then return p + (q - p) * (.666 - t) * 6 end
          return p
      end
      local q
        if l < 0.5 then q = l * (1 + s) else q = l + s - l * s end
        local p = 2 * l - q
        r = hue2rgb(p, q, h + .333)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - .333)
    end
    return r, g, b
end

function get_context ()
  countSelTrack=reaper.CountSelectedTracks(0)
  countSelItem=reaper.CountSelectedMediaItems(0)
  if mouseContext==0 and countSelTrack > 0 then
    trackSet=1 itemset=0
    mouse_info=countSelTrack.." ".."TRACK SELECTED"
  elseif mouseContext==1 and countSelItem > 0 then
    itemSet=1 trackSet=0
    mouse_info=countSelItem.." ".."ITEM SELECTED"
  elseif mouseContext==1 and countSelItem == 0 and countSelTrack>0 then
    trackSet=1 itemSet=0
    mouse_info=countSelTrack.." ".."TRACK SELECTED"
  elseif countSelTrack==0 and countSelItem == 0 then
    trackSet=0 itemSet=0
    mouse_info="NOTHING SELECTED"
  end
end

function map(value, iMin, iMax, oMin, oMax, shape) local n, v
  if math.abs(iMin - iMax) < 0.00000011920929 then v = oMin else
    n = ((value - iMin) / (iMax - iMin))
    v = oMin + (n^shape) * (oMax - oMin)
    if (oMax < oMin) then
      if (v < oMax) then v = oMax elseif (v > oMin) then v = oMin end
    else
      if (v > oMax) then v = oMax elseif (v < oMin ) then v = oMin end
    end
  end
  return v
end

function setColor()
    if trackSet == 1 then
      for i = 0, countSelTrack-1 do
        track = reaper.GetSelectedTrack(0, i)
        local r1, g1, b1 = reaper.ColorFromNative(color1)
        local r2, g2, b2 = reaper.ColorFromNative(color2)
        local r = round(map(i, 0, countSelTrack-1, r1, r2, 1))
        local g = round(map(i, 0, countSelTrack-1, g1, g2, 1))
        local b = round(map(i, 0, countSelTrack-1, b1, b2, 1))
        if r >= 0 and g >= 0 and b >= 0 then
          local color = reaper.ColorToNative(r, g, b)
          reaper.SetTrackColor (track, color)
        end
      end
    reaper.Undo_EndBlock("Colorize! track", -1)
    elseif itemSet == 1 then
      for i = 0 , countSelItem-1 do
        local r1, g1, b1 = reaper.ColorFromNative(color1)
        local r2, g2, b2 = reaper.ColorFromNative(color2)
        local r = round(map(i, 0, countSelItem-1, r1, r2, 1))
        local g = round(map(i, 0, countSelItem-1, g1, g2, 1))
        local b = round(map(i, 0, countSelItem-1, b1, b2, 1))
        if r >= 0 and g >= 0 and b >= 0 then
          local color = reaper.ColorToNative(r, g, b)
          item = reaper.GetSelectedMediaItem(0, i)
          reaper.SetMediaItemInfo_Value(item, "I_CUSTOMCOLOR", color|16777216)
          reaper.UpdateItemInProject(item)
        end
      end
    end
  reaper.TrackList_AdjustWindows(false)
end

function draw_palette(_) local  offset, pal_w
  count = 0
  offset = 2
  pal_w = round(gfx.w - offset)
  for i = 1, col, 1  do
    x = round((i-1) * (pal_w / col) + offset)
    w = round((pal_w /col)- 0.5 * offset)
    h = 20     
    
    for j = 1, row, 1 do
      local red, green, blue, alpha
      if j == 1 then
        red,green,blue=HSLtoRGB(0, 0, 1-i/col) 
      else
        local hue = map(i, 1, col, 0, 0.9, 1)
        red, green, blue=HSLtoRGB(hue, 1, (row-j+1)/row)
      end
        y = round (j * (pal_w / col) + offset)
        gfx.set(red, green, blue, 1)
        gfx.rect (x, y, w, h, 1)
        --border          
        if gfx.mouse_x >= x and gfx.mouse_y >= y and gfx.mouse_x <= x + w and gfx.mouse_y <= y + h then
          for k = 0, 2, 1 do
            gfx.set(0, 0, 0, 0.75 - 0.25 * k)
            gfx.rect (x + k, y + k, w - 2 * k, h - 2 * k, 0)
            local int_r = round(255 * red)
            local int_g = round(255 * green)
            local int_b = round(255 * blue)
            color2 = reaper.ColorToNative(int_r, int_g, int_b) -- integer colour value
            if gfx.mouse_cap == 2 then 
              grad = true
              color1 =  reaper.ColorToNative(int_r, int_g, int_b)
            end
            if grad == false then color1 = color2 end
            setColor()
          end
        else
          gfx.set(0.25, 0.25, 0.25, 0.25)
          gfx.rect (x, y, w, h, 0)
          gfx.set(0, 0, 0, 0.25)
          gfx.rect (x+1, y+1, w-2, h-2, 0) 
        end
    end
  end
end

function window_at_center (title, w, h)
  local l, t, r, b = 0, 0, w, h
  local __, __, screen_w, screen_h = reaper.my_getViewport(l, t, r, b, l, t, r, b, 1)
  local x, y = (screen_w - w) / 2, (screen_h - h) / 2
  gfx.init(title, w, h, 0, x, y)
end

function abort ()
  reaper.Main_OnCommand(40029, 0) -- Undo
  reaper.atexit(exit)
end

function draw()
  mouseContext = reaper.GetCursorContext()
  if mouse_info == nil then mouse_info = 'NOTHING SELECTED' end
  toolbar()
  local width = col * 22 + 2
  local height = (row + 1) * 22 + 2
  window_at_center("Colorize!", width, height)
   
  get_context()
  draw_palette()
  
  gfx.set(0, 1, 1, 0.125)
  gfx.rect(4, 4, gfx.w-8, 16, 1)
  gfx.set(0.25, 1, 1);
  str_w, str_h = gfx.measurestr(mouse_info);
  gfx.x = (gfx.w-str_w)/2;
  gfx.y = 8;
  gfx.drawstr(mouse_info);
  
  local c=gfx.getchar()
  if c == 27 then abort() end
  if gfx.mouse_cap ~= 1 and c~= 27 then reaper.defer(draw) else exit() end -- ESC to exit
  gfx.update()
  
end

function main()
  reaper.Undo_BeginBlock()
  draw()
  reaper.Undo_EndBlock("Colorize! item", -1)
end

main()

