-- @description Ducer Assistant Console
-- @author Ducer (Gemini)
-- @version 1.1
-- @about In-DAW Interactive Console for the Ducer production layer. Build from scratch.

local reaper = reaper

-- --- API CHECK ---
if not reaper.ImGui_CreateContext then
  reaper.ShowMessageBox("ReaImGui no detectado. Instálalo vía ReaPack.", "Ducer Error", 0)
  return
end

-- --- CONFIG & PATHS ---
local RESOURCE_PATH = reaper.GetResourcePath()
local CMD_FILE = RESOURCE_PATH .. "/Scripts/ducer_commands.txt"
local RESP_FILE = RESOURCE_PATH .. "/Scripts/ducer_response.txt"
-- En Windows, buscamos el ejecutable ducer (asumiendo que está en el PATH)
local DUCER_EXE = "ducer service" 

-- --- STATE ---
local ctx = reaper.ImGui_CreateContext('Ducer Console')
local input_buffer = ""
local chat_log = {
  { text = "=== DUCER STAFF ENGINEER CONSOLE ===", color = 0x22D3EEFF },
  { text = "Sistema cargado. Esperando comando...", color = 0xAAAAAAFF }
}
local is_running = false
local is_thinking = false
local auto_scroll = true

-- --- PREMIUM COLORS (Hex: RRGGBBAA) ---
local COLORS = {
  BG = 0x09090BFF,
  TEXT = 0xFAFAFAFF,
  CYAN = 0x22D3EEFF,
  PURPLE = 0xA855F7FF,
  BORDER = 0x27272AFF,
  IDLE = 0x555555FF
}

-- --- HELPERS ---

function log(text, color)
  table.insert(chat_log, { 
    text = os.date("[%H:%M] ") .. text, 
    color = color or COLORS.TEXT 
  })
end

function sendCommand(query)
  local f = io.open(CMD_FILE, "w")
  if f then
    f:write(query)
    f:close()
    log("> " .. query, COLORS.CYAN)
    is_thinking = true
  else
    log("Error: No se pudo escribir en ducer_commands.txt", 0xFF5555FF)
  end
end

function pollResponse()
  local f = io.open(RESP_FILE, "r")
  if f then
    local content = f:read("*a")
    f:close()
    if content and content ~= "" then
      log(content, COLORS.PURPLE)
      is_thinking = false
      -- Clear response file
      local fw = io.open(RESP_FILE, "w"); if fw then fw:close() end
    end
  end
end

function toggleService()
  if not is_running then
    -- Iniciar servicio ducer en segundo plano
    reaper.ExecProcess('cmd.exe /c start /b ' .. DUCER_EXE, -1)
    is_running = true
    log("Ducer Service ONLINE", COLORS.CYAN)
  else
    is_running = false
    log("Ducer Service OFFLINE", COLORS.IDLE)
  end
end

-- --- MAIN LOOP ---

function loop()
  -- CONSTANTS IN REAIMGUI ARE FUNCTIONS
  reaper.ImGui_PushStyleColor(ctx, reaper.ImGui_Col_WindowBg(), COLORS.BG)
  reaper.ImGui_PushStyleColor(ctx, reaper.ImGui_Col_Border(), COLORS.BORDER)
  reaper.ImGui_PushStyleVar(ctx, reaper.ImGui_StyleVar_WindowRounding(), 8)
  
  local window_flags = reaper.ImGui_WindowFlags_NoCollapse()
  local visible, open = reaper.ImGui_Begin(ctx, 'DUCER CONSOLE', true, window_flags)
  
  if visible then
    -- Top Bar
    if reaper.ImGui_Button(ctx, is_running and "STOP SERVICE" or "START SERVICE") then
      toggleService()
    end
    reaper.ImGui_SameLine(ctx)
    reaper.ImGui_TextColored(ctx, is_running and COLORS.CYAN or COLORS.IDLE, is_running and " [READY]" or " [OFFLINE]")
    
    reaper.ImGui_Separator(ctx)

    -- Status Stimulus
    if is_thinking then
      local label = "DUCER IS THINKING" .. string.rep(".", math.floor(os.clock() * 3) % 4)
      reaper.ImGui_TextColored(ctx, COLORS.PURPLE, label)
    else
      reaper.ImGui_TextDisabled(ctx, "Esperando entrada...")
    end

    -- Chat Display
    local footer_h = reaper.ImGui_GetFrameHeightWithSpacing(ctx) + 8
    if reaper.ImGui_BeginChild(ctx, "Log", 0, -footer_h, 1) then
      for _, line in ipairs(chat_log) do
        reaper.ImGui_TextColored(ctx, line.color, line.text)
      end
      if auto_scroll and reaper.ImGui_GetScrollY(ctx) >= reaper.ImGui_GetScrollMaxY(ctx) then
        reaper.ImGui_SetScrollHereY(ctx, 1.0)
      end
      reaper.ImGui_EndChild(ctx)
    end

    -- Input Area
    reaper.ImGui_PushItemWidth(ctx, -1)
    local changed, new_val = reaper.ImGui_InputText(ctx, "##In", input_buffer, reaper.ImGui_InputTextFlags_EnterReturnsTrue())
    if changed and new_val ~= "" then
      sendCommand(new_val)
      input_buffer = ""
    end
    
    if is_running then pollResponse() end
  end
  reaper.ImGui_End(ctx)
  
  reaper.ImGui_PopStyleVar(ctx)
  reaper.ImGui_PopStyleColor(ctx, 2)

  if open then
    reaper.defer(loop)
  end
end

loop()
