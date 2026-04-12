--[[
  @description Rename and renumber selected tracks, name by name
  @about
    #  Rename selected tracks by increasing their final number  
    Rename selected tracks individually
    by increasing their final number (if they have one),
    or adding a number, starting from 1 (if they don't).
    Useful after duplicating tracks for further recording
    so each new track gets a different name.
  @version 1.0.3
  @changelog Improved @about tag
  @author Juan_R
  @date 2022.11.14
  @action_name Rename and renumber selected tracks, name by name
]]--

Action_Name = "Rename and renumber selected tracks, name by name"

-- divide Track_name into initial basename and final number,
-- noting how many digits are in number
function parse_name(trackname)
    local number = string.match (trackname, "(%d*)$")
    local numberdigits = #number
    local basename = string.sub(trackname, 1 , -numberdigits-1)
    return basename, tonumber(number), tonumber(numberdigits)
end


function Main()
  reaper.Undo_BeginBlock()
  reaper.ClearConsole()
  Num_of_tracks = reaper.CountSelectedTracks(0)
  
  -- maxnumber[basename] = maximum number found in track names after basename
  maxnumber = {}
  Tracks = {}
  
  -- collect names and possibly numbers

  for i = 0, Num_of_tracks - 1 do
    Tracks[i] = {}
    Tracks[i].mediatrack = reaper.GetSelectedTrack(0,i)
    _, Tracks[i].name = reaper.GetTrackName(Tracks[i].mediatrack, "")

    local basename, number, numberdigits = parse_name(Tracks[i].name)
    if numberdigits == 0 then -- no final number in trackname, we say it's 0 (1 digit)
      number = 0
      numberdigits = 1
    end
    Tracks[i].basename = basename
    Tracks[i].number = number
    Tracks[i].ndigits = numberdigits

    -- find out the max number associated to the given basename

    -- first occurrence of basename? Initialize maxnumber to wimpy maximum
    if maxnumber[basename] == nil then maxnumber[basename] = -1 end
    if number > maxnumber[basename] then maxnumber[basename] = number end
  end

  -- rename the tracks
  for i = 0, Num_of_tracks - 1 do
    new_number = maxnumber[Tracks[i].basename] + 1
    maxnumber[Tracks[i].basename] = new_number
    format = string.format("%%0%dd", Tracks[i].ndigits); -- e.g, "%03d" if it was 3 digits
    new_name = Tracks[i].basename .. string.format(format, new_number);
    
    reaper.GetSetMediaTrackInfo_String(Tracks[i].mediatrack, "P_NAME", new_name, true)
  end
  reaper.Undo_EndBlock(Action_Name, -1)
end

Main()
