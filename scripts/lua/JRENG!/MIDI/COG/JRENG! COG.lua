--[[
 * ReaScript Name: Chord Generator
 * About: Chord generator for MIDI Editor
 * Screenshot: 
 * Author: JRENG!
 * Author URI: http://jrengmusic.com
 * Repository: GitHub > jrengmusic > ReaScript
 * Repository URI: https://github.com/jrengmusic/ReaScript
 * Licence: WTFPL
 * Forum Thread: JRENG! Chord Generator
 * Forum Thread URI: 
 * REAPER: 5.0
 * Version: 1.0
--]]
 
--[[
 * Changelog:
 * v1.0 (2020-10-23)
  # Public release

--]]
function print(m)
  reaper.ShowConsoleMsg(tostring(m) .. "\n")
end

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

function abort ()
  reaper.Main_OnCommand(40029, 0) -- Undo
  reaper.atexit(exit)
end

function window_at_center (title, w, h)
  local l, t, r, b = 0, 0, w, h
  local __, __, screen_w, screen_h = reaper.my_getViewport(l, t, r, b, l, t, r, b, 1)
  local x, y = (screen_w - w) , (screen_h - h) / 2
  gfx.init(title, w, h, 0, x, y)
end

function clamp(num, min, max)
  if num < min then
    num = min
  elseif num > max then
    num = max
  end
  return num
end

function mouse_polar()
  local dx = (gfx.mouse_x - x0)
  local dy = (gfx.mouse_y - y0)
  local a
  d = math.sqrt(dx^2 + dy^2)
  if dx < 0 then a = 270 else a = 90 end
  angle = a + math.deg(math.atan(dy / dx))
end

function mouseOnRect(x1, y1, w, h)
  local x = gfx.mouse_x
  local y = gfx.mouse_y
  return x > x1 and y > y1 and x < x1 + w and y < y1 + h
end

function load_img()
  img = {
    {"01_bg.png", x = 0, y = 0},
    {"02_center_bg.png", x = 255, y = 255},
    {"03_center_off.png", x = 87, y = 87},
    {"04_C_center_sel.png", x = 254, y = 87},
    {"05_G_center_sel.png", x = 351, y = 95},
    {"06_D_center_Sel.png", x = 418, y = 153},
    {"07_A_center_sel.png", x = 457, y = 254},
    {"08_E_center_sel.png", x = 418, y = 351},
    {"09_B_center_sel.png", x = 351, y = 418},
    {"10_Gb_center_sel.png", x = 254, y = 457}, 
    {"11_Db_center_sel.png", x = 153, y = 418},
    {"12_Ab_center_sel.png", x = 95, y = 351},
    {"13_Eb_center_sel.png", x = 87, y = 254},
    {"14_Bb_center_sel.png", x = 95, y = 153},
    {"15_F_center_sel.png", x = 153, y = 95},
    {"16_inside_bg.png", x = 255, y = 255},
    {"17_inside_off.png", x = 164, y = 164},
    {"18_inside_c_sel.png", x = 164, y = 314},
    {"19_inside_g_sel.png", x = 164, y = 239},
    {"20_inside_d_sel.png", x = 184, y = 184},
    {"21_inside_a_sel.png", x = 239, y = 164},
    {"22_inside_e_sel.png", x = 314, y = 164},
    {"23_inside_b_sel.png", x = 351, y = 184},
    {"24_inside_gb_sel.png", x = 378, y = 239},
    {"25_inside_db_sel.png", x = 379, y = 314},
    {"26_inside_ab_sel.png", x = 351, y = 351},
    {"27_inside_eb_sel.png", x = 314, y = 378},
    {"28_inside_bb_sel.png", x = 239, y = 379},
    {"29_inside_f_sel.png", x = 184, y = 351},
    {"30_outside_bg.png", x = 255,y = 255},
    {"31_outside_off.png", x = 16,y = 16},
    {"32_C_outside_sel.png", x = 74, y = 74},
    {"33_G_outside_sel.png", x = 196, y = 16},
    {"34_D_outside_sel.png", x = 341, y = 16},
    {"35_A_outside_sel.png", x = 449, y = 74},
    {"36_E_outside_sel.png", x = 521, y = 196},
    {"37_B_outside_sel.png", x = 521, y = 341},
    {"38_Gb_outside_sel.png", x = 449, y = 449},
    {"39_Db_outside_sel.png", x = 341, y = 521},
    {"40_Ab_outside_sel.png", x = 196, y = 521},
    {"41_Eb_outside_sel.png", x = 74, y = 449},
    {"42_Bb_outside_sel.png", x = 16, y = 341},
    {"43_F_outside_sel.png", x = 16, y = 196},
    {"44_add_on.png"},
    {"45_sub_on.png"},
  }
  
  local info = debug.getinfo(1,'S')
  local path = info.source:match[[^@?(.*[\/])[^\/]-$]] .. "img/"  
  
  for i = 1, 45, 1 do
    gfx.loadimg(i, path .. img[i][1])
  end
end

function key_init()  
  key = {
    {i = 0, root = "C"},
    {i = 7, root = "G"},
    {i = 2, root = "D"},
    {i = 9, root = "A"},
    {i = 4, root = "E"},
    {i = 11, root = "B"},
    {i = 6, root = "Gb"},
    {i = 1, root = "Db"},
    {i = 8, root = "Ab"},
    {i = 3, root = "Eb"},
    {i = 10, root = "Bb"},
    {i = 5, root = "F"},
  }
  
  interval = {
    {i = 1, label = "m2"},
    {i = 2, label = "sus2"},
    {i = 3, label = "b3"},
    {i = 4, label = "3"},
    {i = 5, label = "sus4"},
    
    {i = 6, label = "b5"},
    {i = 7, label = "5"},
    {i = 8, label = "#5"},
    {i = 9, label = "6"},
    
    {i = 10, label = "7"},
    {i = 11, label = "7"},
    {i = 12, label = ""},
    {i = 13, label = "7b9"},
    {i = 14, label = "9"},
    {i = 15, label = "7#9"}
  }
  
  ext = {
    {label = "0"},
    {label = "7"},
    {label = "b9"},
    {label = "9"},
    {label = "#9"},
  }
  

end

function insert_chord(__1, __3, __5, __7, __x)
  local take = reaper.MIDIEditor_GetTake(reaper.MIDIEditor_GetActive())
  local grid = reaper.TimeMap2_QNToTime(0,reaper.MIDI_GetGrid(take)) -- in seconds
  local cursor = reaper.GetCursorPositionEx(0)
  local vel = reaper.MIDIEditor_GetSetting_int(reaper.MIDIEditor_GetActive(), 'default_note_vel')
  local chan = reaper.MIDIEditor_GetSetting_int(reaper.MIDIEditor_GetActive(), 'default_note_chan')
  local startppq = reaper.MIDI_GetPPQPosFromProjTime(take, cursor)
  local endppq = reaper.MIDI_GetPPQPosFromProjTime(take, cursor + grid)

  local root = __1 + (_oct * 12) + 24 -- C0
  local third = root + __3
  local fifth = root + __5
  local seventh 
  local exten 
  if __7 ~= nil then seventh = root + __7 end
  if __x ~= nil then exten = root + __x end

  
  reaper.MIDIEditor_OnCommand(reaper.MIDIEditor_GetActive(), 40214) -- Edit: Unselect all
  -- Root
  reaper.MIDI_InsertNote(take, true, false, startppq, endppq, chan, root, vel, true)
  
  
  -- 3rd
  reaper.MIDI_InsertNote(take, true, false, startppq, endppq, chan, third, vel, true)
  
  -- 5th
  reaper.MIDI_InsertNote(take, true, false, startppq, endppq, chan, fifth, vel, true)

  if seventh ~= nil then
    reaper.MIDI_InsertNote(take, true, false, startppq, endppq, chan, seventh, vel, true)
  end
  
  if exten ~= nil then
    reaper.MIDI_InsertNote(take, true, false, startppq, endppq, chan, exten, vel, true)  
  end
  
  reaper.MIDI_Sort(take)
  reaper.MoveEditCursor(grid, 0)
end

-----------------------------------------------------------------------------------------------
-- Polar Button Object
-----------------------------------------------------------------------------------------------
PolarButton = {}       -- THE CLASS

PolarButton.new = function(r0, r1, seg, a0)
  
  local this = {}      
  r0 = r0 or 0            
  r1 = r1 or 0           
  seg = seg or 0  
  a0 = a0 or 0

  this.setPolar = function(_k)
    this.k = _k
  end
  
  this.setImage = function(_i)
    this.img = _i
  end
  
  this.setAngleOffset = function (_a_off)
    this.a_off = _a_off or 0
  end

  this.setColor = function (_red, _green, _blue)
    this.red = _red or 0
    this.green = _green or 1
    this.blue = _blue or 1
  end
  
  this.setTones = function(_3rd, _5th, _7th, _ext)
    this._3rd = _3rd
    this._5th = _5th
    this._7th = _7th
    this._ext = _ext
  end

  this.draw = function()    
    gfx.x = img[this.img + 1].x * 2
    gfx.y = img[this.img + 1].y * 2
    gfx.blit(this.img + 1, 1, 0)
    
    if d > r0 and d < r1 then
      this.b0 = (math.floor(seg * (angle + a0)/360) + 1)
      if this.b0 > seg then this.b0 = 1 end        
  
      this.b1 = this.b0 + 1
      if this.b1 > seg then this.b1 = 1 end  
      
      local seg_length = (360/seg) 
      local aL = this.b0 * seg_length - seg_length - a0
      if aL < 0 then aL = aL + 360 end
      local aR = this.b0 * seg_length - a0
      
      if aR < aL then
        aR = aR + 360
        if angle < seg_length/2 then angle = angle + 360 end
      end

      if this.a_off ~= nil then
        aL = aL + this.a_off
        aR = aR - this.a_off
      end
      
      local key_index = this.b0 + this.k
      if key_index > seg then key_index = key_index - seg end
      this.key = key[key_index].root
      
      if angle > aL and angle < aR then
        gfx.x = img[this.img].x * 2
        gfx.y = img[this.img].y * 2
        gfx.blit(this.img, 1, 0)

        gfx.set(this.red, this.green, this.blue)
        
        this.third = ""
        this.fifth = ""
        this.seventh = ""
        this.ext = ""
        
        if this._7th ~= nil then
          if this._7th >= 10 then
            if this._5th ~= 7 then
              this.fifth = interval[this._5th].label
            end
            this.seventh = interval[this._7th].label
            if this._7th == 11 then this.seventh = "Δ" .. this.seventh end
          end
        end
        
        if this._ext ~= nil then
          if this._7th == 11 then this.seventh = "Δ" else this.seventh = "" end
          this.ext = interval[this._ext].label
        end
        
        if this._3rd == 3 then this.third = "-" end
        
        if _ext == 1 then
          if this._3rd == 3 then 
            if this._5th == 6 then this.third = "o" 
          else this.third = "m" end
          elseif this._3rd == 4 then this.third = "Δ" end
        end
        
        if this._3rd < 3 or this._3rd > 4 then
          this.third = interval[this._3rd].label
          this.chord = this.seventh .. this.ext .. this.fifth .. this.third
        else
          this.chord = this.third .. this.seventh .. this.ext .. this.fifth
        end
        
        local font_sz_key = 64
        local font_sz_chord = 36
        
        gfx.setfont(1,"Olney", font_sz_key)
        local b_strw, b_strh = gfx.measurestr(this.key)
        gfx.setfont(1,"Olney", font_sz_chord)
        local s_strw, s_strh = gfx.measurestr(this.chord)
        
        local strw = b_strw + s_strw
        local strh = b_strh
        local xb = x0 - strw/2
        local yb = y0 - strh/2
        local xs = xb + b_strw
        local ys = yb
        
        gfx.x = xb
        gfx.y = yb
        gfx.setfont(1,"Olney", font_sz_key)
        gfx.drawstr(this.key)
        gfx.x = xs
        gfx.y = ys
        gfx.setfont(1,"Olney", font_sz_chord)
        gfx.drawstr(this.chord)
        
        
        
        if mouseHold ~= 1 then
          local index = this.img + key_index + 1
          this.x = img[index].x
          this.y = img[index].y 
          gfx.x = this.x * 2
          gfx.y = this.y * 2
          gfx.blit(index, 1, 0)
        end
        
        local __1 = key[key_index].i
        local __3 = interval[this._3rd].i
        local __5 = interval[this._5th].i
        local __7
        local __x 
        if this._7th ~= nil then __7 = interval[this._7th].i end
        if this._ext ~= nil then __x = interval[this._ext].i end
        if mouseClick == 1 then insert_chord(__1,__3,__5,__7,__x) end
      end
    end
  end
  
  return this
end
--------------------------------------------------------------------------------------------
-- Counter Object
--------------------------------------------------------------------------------------------
Modifier = {}

Modifier.new = function (x, y)
  local this = {}
  x = x or 0
  y = y or 0
  
  this.setVal = function(val, min, max)
    this.default_val = val
    this.val = val
    this.min = min
    this.max = max
  end
  
  this.setImage = function(add_i, sub_i)
    this.add_i = add_i
    this.sub_i = sub_i
  end
  
  this.setLabel = function(label)
    this.label = tostring(label)
  end
  
  this.draw = function()
    local rect_sz = 32
    local space = 48
    local add_x = x + space
    local add_y = y - rect_sz/2
    local sub_x = x - space - rect_sz
    local sub_y = add_y
    gfx.set(0, 1, 1)
    
    if mouseOnRect(add_x, add_y, rect_sz, rect_sz) then 
      if mouseHold ~= 1 then
        gfx.x = add_x
        gfx.y = add_y
        gfx.blit(this.add_i, 1, 0)
      end 
      if mouseClick == 1 then 
        this.val = this.val + 1
        this.val = clamp(this.val, this.min, this.max)
      end
    elseif mouseOnRect(sub_x, sub_y, rect_sz, rect_sz) then 
      if mouseHold ~= 1 then
        gfx.x = sub_x
        gfx.y = sub_y
        gfx.blit(this.sub_i, 1, 0)
      end  
      if mouseClick == 1 then 
        this.val = this.val - 1
        this.val = clamp(this.val, this.min, this.max)
      end
    end
    
    local n_rect_sz = 80
    local n_rect_x = x - n_rect_sz/2
    local n_rect_y = y - n_rect_sz/2
    if mouseOnRect(n_rect_x, n_rect_y, n_rect_sz, n_rect_sz) then
      if mouseClick == 1 and ctrl == 4 then this.val = this.default_val end
    end
    
    
    
    local font_sz = 36
    gfx.setfont(1,"Olney", font_sz)
    local strw, strh = gfx.measurestr(this.label)
    
    if strw > 80 then
      font_sz = font_sz * 0.75
      gfx.setfont(1,"Olney", font_sz)
      strw, strh = gfx.measurestr(this.label)
    end
    
    gfx.x = x - strw/2
    gfx.y = y - strh/2 + 3
    gfx.drawstr(this.label)
  end
  return this
end

--------------------------------------------------------------------------------------------
function mouseCap ()
  mouseHold=gfx.mouse_cap&1
  ctrl=gfx.mouse_cap&4
  mouseClick=mouseHold-lastCap
  lastCap=mouseHold
  char = gfx.getchar()
  if char == 32 then -- spacebar PLAY/STOP
    reaper.MIDIEditor_LastFocused_OnCommand (40016,0)
  elseif char == 119 then -- W GO TO START
    reaper.MIDIEditor_LastFocused_OnCommand (40036,0)
  elseif char == 61 then -- = ZOOM IN
    reaper.MIDIEditor_LastFocused_OnCommand (1012,0)
  elseif char == 45 then -- - ZOOM OUT
    reaper.MIDIEditor_LastFocused_OnCommand (1011,0)
  elseif char == 26 then
    reaper.MIDIEditor_LastFocused_OnCommand(40013,0) -- undo
  elseif gfx.mouse_cap == 16 and char == 49 then reaper.Main_OnCommand (40781,0) 
  elseif gfx.mouse_cap == 16 and char == 50 then reaper.Main_OnCommand (40780,0) 
  elseif gfx.mouse_cap == 16 and char == 51 then reaper.Main_OnCommand (40775,0) 
  elseif gfx.mouse_cap == 16 and char == 52 then reaper.Main_OnCommand (40779,0) 
  elseif gfx.mouse_cap == 16 and char == 54 then reaper.Main_OnCommand (40776,0) 
  elseif gfx.mouse_cap == 16 and char == 56 then reaper.Main_OnCommand (40778,0) 
  elseif gfx.mouse_cap == 16 and char == 340 then reaper.MIDIEditor_OnCommand (reaper.MIDIEditor_GetActive(), reaper.NamedCommandLookup("_NF_ME_TOGGLETRIPLET", 0))
  elseif gfx.mouse_cap == 16 and char == 46 then reaper.MIDIEditor_OnCommand(reaper.MIDIEditor_GetActive(), reaper.NamedCommandLookup("_NF_ME_TOGGLEDOTTED", 0))
  elseif char == 8 then
    reaper.MIDIEditor_LastFocused_OnCommand(40440,0)
    reaper.MIDIEditor_LastFocused_OnCommand(40667,0)
    reaper.MIDIEditor_LastFocused_OnCommand(reaper.NamedCommandLookup("_FNG_ME_SELECT_NOTES_NEAR_EDIT_CURSOR"),0)
  end
end
----------------------------------------------------------------------------------------------
function init ()
  toolbar()
  gfx.ext_retina = 1.0
  window_at_center("Chord Generator", 640, 640)
  
  lastCap = 1
  _oct = 3
  _ext = 2
  
  _3rd = 4
  _5th = 7

  
  r0_inside = 150
  r1_inside = 299
  r0_center = 300
  r1_center = 449
  r0_outside = 450
  r1_outside = 600
  
  x0 = gfx.w * 0.5
  y0 = gfx.h * 0.5
  
  local seg = 12
  
  
  key_init()
  load_img()
  
  _oct_mod = Modifier.new(140, 140)
  _oct_mod.setVal(_oct, 0, 7)
  _oct_mod.setImage(44, 45)
  
  _3rd_mod_x = 140
  _3rd_mod_y = 1140
  _3rd_mod = Modifier.new(_3rd_mod_x, _3rd_mod_y)
  _3rd_mod.setVal(_3rd, 2, 5)
  _3rd_mod.setImage(44, 45)
  
  _5th_mod_x = 1140
  _5th_mod_y = 1140
  _5th_mod = Modifier.new(_5th_mod_x, _5th_mod_y)
  _5th_mod.setVal(_5th, 6, 8)
  _5th_mod.setImage(44, 45)
  
  _ext_mod = Modifier.new(1140, 140)
  _ext_mod.setVal(_ext, 1, 5)
  _ext_mod.setImage(44, 45)
  
  cyan = PolarButton.new(r0_center, r1_center, seg, 180/12)
  cyan.setColor(0, 1, 1)
  cyan.setImage(2)
  cyan.setAngleOffset(2)
  cyan.setPolar(0)
  
  orange = PolarButton.new(r0_inside, r1_inside, seg, 0)
  orange.setColor(1, 0.35, 0.15)
  orange.setImage(16)
  orange.setPolar(4)
  
  peach = PolarButton.new(r0_outside, r1_outside, seg, 0)
  peach.setColor(0.875, 0.827, 0.737)
  peach.setImage(30)
  peach.setAngleOffset(8)
  peach.setPolar(2)  
end

function draw()
  gfx.x = 0
  gfx.y = 0
  gfx.blit(1, 1, 0)
  
  mouseCap()
  mouse_polar()  
  
  _oct_mod.draw()
  _oct_mod.setLabel(_oct)
  _oct = _oct_mod.val
  
  _ext_mod.draw()
  _ext_mod.setLabel(ext[_ext].label)
  _ext = _ext_mod.val
  
  if _ext > 1 then
    _3rd_mod.draw()
    _3rd_mod.setLabel(interval[_3rd].label)
    _3rd = _3rd_mod.val
    
    _5th_mod.draw()
    _5th_mod.setLabel(interval[_5th].label)
    _5th = _5th_mod.val
  else
    gfx.set(0, 0, 0, 0.7)
    local r = 100
    gfx.circle(_3rd_mod_x, _3rd_mod_y, r, 1)
    gfx.circle(_5th_mod_x, _5th_mod_y, r, 1)
    gfx.a = 1
  end
  
  --------------------------------------- CHORD RULES ----------------------------------------
 
  if _ext >= 2 then
    if _3rd < 3 or _3rd > 4 then 
      peach_3rd = _3rd
      peach_5th = 7
      cyan_5th = 7
    else 
      peach_3rd = 4
      peach_5th = _5th 
      cyan_5th = _5th
    end
    if _ext == 2 then
      cyan_7th = 11
      orange_7th = 10
      peach_7th = 10
      
      cyan_ext = nil
      orange_ext = nil
      peach_ext = nil
    else
      cyan_7th = 11
      orange_7th = 10
      peach_7th = 10
    
      cyan_ext = _ext + 10
      orange_ext = _ext + 10
      peach_ext = _ext + 10
    end
    
    cyan_3rd = _3rd
    orange_5th = _5th
    
  elseif _ext < 2 then
    cyan_3rd = 4
    orange_3rd = 3
    peach_3rd = 3
    
    cyan_5th = 7
    orange_5th = 7
    peach_5th = 6
    
    cyan_7th = nil
    orange_7th = nil
    peach_7th = nil
  end

  
  --------------------------------------------------------------------------------------------
  
  cyan.draw()
  cyan.setTones(cyan_3rd, cyan_5th, cyan_7th, cyan_ext)
  
  orange.draw()
  orange.setTones(3, orange_5th, orange_7th, orange_ext)
  
  peach.draw()
  peach.setTones(peach_3rd, peach_5th, peach_7th, peach_ext)

  if char == 27 then abort() end
  if char ~= 27 then reaper.defer(draw) else exit() end -- ESC to exit
  gfx.update()
end

function main()
  init()
  draw()
end

main()
