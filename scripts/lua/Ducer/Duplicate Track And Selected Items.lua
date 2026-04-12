-- @description me2beats Move selected items to next track + MK MOD
local r = reaper

r.Undo_BeginBlock()
r.PreventUIRefresh(1)

function RazorEditSelectionExists()
    for i=0, r.CountTracks(0)-1 do
        local retval, x = r.GetSetMediaTrackInfo_String(r.GetTrack(0,i), "P_RAZOREDITS", "string", false)
        if x ~= "" then return true end
    end--for  
    return false
end

local init_count_items = r.CountSelectedMediaItems(0)
local start, ending = r.GetSet_LoopTimeRange( 0, 0, 0, 0, 0 )

if start ~= ending or RazorEditSelectionExists() == true then -- if selection or RE exist
   if  init_count_items == 0 then
      r.Main_OnCommand(40718, 0) -- Item: Select all items on selected tracks in current time selection
   end
   r.Main_OnCommand(40061, 0) -- split at selection
end


local items = r.CountSelectedMediaItems(0)
local count_tr = r.CountSelectedTracks(0)
local it_tr0 = r.GetSelectedTrack(0,0)
local all_items = r.CountTrackMediaItems(it_tr0)
local dupl = 0
local diff = 0
local t = {}


for i = 0, items-1 do
  local item = r.GetSelectedMediaItem(0,i)
  t[#t+1] = item
  it_tr = r.GetMediaItem_Track(item)
  if it_tr0 ~= it_tr then diff = 1 end -- if sel item on a diff track
  if items == all_items then dupl = 1 end -- if all items selected
end

    r.Main_OnCommand(40062, 0) -- Duplicate selected track

if dupl == 0 then
    r.Main_OnCommand(r.NamedCommandLookup("_SWS_DELALLITEMS"),0) -- SWS: Delete all items on selected track(s)

    if count_tr < 2 and diff == 0 then
         r.Main_OnCommand(r.NamedCommandLookup("_XENAKIOS_SELPREVTRACK"),0) -- Xenakios/SWS: Select previous tracks    
         if it_tr0 ~= nil then     
             tr = r.GetTrack(0, r.GetMediaTrackInfo_Value(it_tr0, 'IP_TRACKNUMBER'))
             if tr then   
                 for i = 1, #t do r.MoveMediaItemToTrack(t[i],tr) end
             end 
         end
    end

end

r.UpdateArrange()

r.PreventUIRefresh(-1)
r.Undo_EndBlock('Duplicate Track And Selected Items', -1)
