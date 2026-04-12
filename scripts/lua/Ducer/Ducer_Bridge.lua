-- Ducer_Bridge.lua
-- File-based bridge para recibir comandos de Ducer
-- Ubicacion: %APPDATA%\REAPER\Scripts\Ducer_Bridge.lua

local BRIDGE_FILE = reaper.GetAppPath() .. "/Scripts/ducer_commands.txt"
local LAST_CHECK = 0

function log(msg)
  reaper.ShowConsoleMsg("[Ducer] " .. msg .. "\n")
end

function executeCommand(cmd)
  cmd = cmd:gsub("%s+$", ""):gsub("^%s+", "")
  log("Comando: " .. cmd)
  
  -- Formato: action:12345
  if cmd:sub(1, 7) == "action:" then
    local id = tonumber(cmd:sub(8))
    if id then
      reaper.Main_OnCommand(id, 0)
      log("Ejecutado action: " .. id)
      return true
    end
  end
  
  -- Formato: project:"path"
  if cmd:sub(1, 8) == "project:" then
    local path = cmd:sub(9):gsub('"', "")
    if path and path ~= "" then
      reaper.Main_openProject(path)
      log("Proyecto: " .. path)
      return true
    end
  end
  
  -- Formato: play, stop, pause, record
  if cmd == "play" then
    reaper.OnPlayButton()
    return true
  end
  if cmd == "stop" then
    reaper.OnStopButton()
    return true
  end
  if cmd == "pause" then
    reaper.OnPauseButton()
    return true
  end
  if cmd == "record" then
    reaper.OnRecordButton()
    return true
  end
  if cmd == "rewind" then
    reaper.CSurf_Rewind(0)
    return true
  end
  if cmd == "forward" then
    reaper.CSurf_FastForward(0)
    return true
  end
  
  -- Markers
  if cmd:sub(1, 8) == "marker:" then
    local idx = tonumber(cmd:sub(9))
    if idx then
      reaper.GoToMarker(0, idx, false)
      return true
    end
  end
  
  log("Comando desconocido: " .. cmd)
  return false
end

function processBridgeFile()
  local file = io.open(BRIDGE_FILE, "r")
  if file then
    local cmd = file:read("*l")
    file:close()
    
    if cmd and cmd ~= "" then
      local success = executeCommand(cmd)
      -- Limpiar archivo
      local f = io.open(BRIDGE_FILE, "w")
      if f then f:close() end
      return success
    end
  end
  return false
end

function mainLoop()
  processBridgeFile()
  reaper.defer(mainLoop)
end

log("Ducer Bridge iniciado - esperando comandos...")
mainLoop()
