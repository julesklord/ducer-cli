-- @description Delete notes after edit cursor (in selected item(s) or MIDI editor)
-- @version 1.31
-- @changelog
--  * bug fixes and improvements
-- @author Stephan Römer, with a lot of help from FnA and Julian Sader
-- @provides [main=main,midi_editor,midi_inlineeditor] .
-- @about
--    # Description
--    * This script deletes all notes after the edit cursor in currently selected items or in the currently opened take in the MIDI editor.
--    * This script works in the MIDI editor and inline editor and in the arrange view
-- @link https://forums.cockos.com/showthread.php?p=1923923


local function Delete_Notes(take, item, cursor_position)

	-- create table for note-ons

	note_on_tagging = {}
	for c = 0, 15 do -- channel table
		note_on_tagging[c] = {}
		for f = 0, 2, 2 do -- flag table
			note_on_tagging[c][f] = {}
		end
	end

	item_start = reaper.GetMediaItemInfo_Value(item, "D_POSITION")
	item_start_ppq = reaper.MIDI_GetPPQPosFromProjTime(take, item_start) -- convert item_start to PPQ
	cursor_position_ppq = reaper.MIDI_GetPPQPosFromProjTime(take, cursor_position) -- convert cursor_position to PPQ
				
	got_all_ok, midi_string = reaper.MIDI_GetAllEvts(take, "") -- write MIDI events to midi_string, get all events okay
	if not got_all_ok then reaper.ShowMessageBox("Error while loading MIDI", "Error", 0) return(false) end -- if getting the MIDI data failed

	midi_len = #midi_string -- get string length
	table_events = {} -- initialize table, MIDI events will temporarily be stored in this table until they are concatenated into a string again
	string_pos = 1 -- position in midi_string while parsing through events 
	sum_offset = 0 -- initialize sum_offset (adds all offsets to get the position of every event in ticks)

	while string_pos < midi_len-12 do -- parse through all events in the MIDI string, one-by-one, excluding the final 12 bytes, which provides REAPER's All-notes-off end-of-take message
		offset, flags, msg, string_pos = string.unpack("i4Bs4", midi_string, string_pos) -- unpack MIDI-string on string_pos
		sum_offset = sum_offset+offset -- add all event offsets to get next start position of event on each iteration
		event_start = item_start_ppq+sum_offset -- calculate event start position based on item start position
		event_type = msg:byte(1)>>4 -- save 1st nibble of status byte (contains info about the data type) to event_type, >>4 shifts the channel nibble into oblivion
		
		if event_type == 9 and msg:byte(3) ~= 0 then -- if note-on and velocity is not 0
			channel = msg:byte(1)&0x0F
			pitch = msg:byte(2)
			
			-- check if current note-on is already tagged, before a note off has been found = overlapping note-ons!
			if note_on_tagging[channel][flags&2][pitch] then
				reaper.ShowMessageBox("Can't delete, because overlapping notes were found", "Error", 0)
				return false

			-- note-on after cursor position? delete	
			elseif event_start >= cursor_position_ppq then
				msg = 0 -- delete
				note_on_tagging[channel][flags&2][pitch] = true -- tag note-on for deletion
			end
		
		elseif event_type == 8 or (event_type == 9 and msg:byte(3) == 0) then -- if note-off
				
			channel = msg:byte(1)&0x0F
			pitch = msg:byte(2)

			-- note-off found for matching note-on (after cursor)? delete
			if note_on_tagging[channel][flags&2][pitch] then -- matching note-on tagged for deletion?
				msg = 0 -- delete
				note_on_tagging[channel][flags&2][pitch] = nil -- reset tag
			end
		end
		table.insert(table_events, string.pack("i4Bs4", offset, flags, msg)) -- re-pack MIDI string and write to table
	end

	reaper.MIDI_SetAllEvts(take, table.concat(table_events) .. midi_string:sub(-12))
	reaper.MIDI_Sort(take)
end


-- check, where the user wants to delete notes: MIDI editor, inline editor or anywhere else

local window, _, details = reaper.BR_GetMouseCursorContext() -- initialize cursor context
local _, inline_editor, _, _, _, _ = reaper.BR_GetMouseCursorContext_MIDI() -- check if mouse hovers an inline editor

local cursor_position = reaper.GetCursorPosition()  -- get edit cursor position 

if window == "midi_editor" and not inline_editor then -- MIDI editor focused and not hovering inline editor
	local midi_editor = reaper.MIDIEditor_GetActive() -- get active MIDI editor
	local take = reaper.MIDIEditor_GetTake(midi_editor) -- get take from active MIDI editor
	local item = reaper.GetMediaItemTake_Item(take) -- get item from take
	Delete_Notes(take, item, cursor_position) -- execute function	

else -- if user is in the inline editor or anywhere else
	if reaper.CountSelectedMediaItems(0) == 0 then
		reaper.ShowMessageBox("Please select at least one item", "Error", 0)
		return false

	else 
		for i = 0, reaper.CountSelectedMediaItems(0)-1 do -- loop through all selected items
			local item = reaper.GetSelectedMediaItem(0, i) -- get current selected item
			local take = reaper.GetActiveTake(item)
			if reaper.TakeIsMIDI(take) then
				Delete_Notes(take, item, cursor_position) -- execute function
			else
				reaper.ShowMessageBox("Selected item #".. i+1 .. " does not contain a MIDI take and won't be altered", "Error", 0)	
			end	
		end
	end
end

reaper.UpdateArrange()
reaper.Undo_OnStateChange2(proj, "Delete notes after edit cursor (in selected item(s) or MIDI editor)")