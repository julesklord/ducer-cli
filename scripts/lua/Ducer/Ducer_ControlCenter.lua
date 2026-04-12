-- Ducer_ControlCenter.lua
-- Version 3.0: "Direct Language" Production Assistant Bridge
-- Optimizado por Ducer (Gemini Flash 3)

local VERSION = "3.0"
local RESOURCE_PATH = reaper.GetResourcePath()
local CMD_FILE = RESOURCE_PATH .. "/Scripts/ducer_commands.txt"
local RESP_FILE = RESOURCE_PATH .. "/Scripts/ducer_response.txt"

-- API de Alto Nivel
local API = {}

function API.ping() return "pong" end

function API.status()
  local playState = reaper.GetPlayState()
  local cursor = reaper.GetCursorPosition()
  local proj = reaper.EnumProjects(-1, "")
  local _, projPath = reaper.GetProjectName(proj, "")
  return string.format("v:%s|state:%d|cursor:%.3f|proj:%s", VERSION, playState, cursor, projPath)
end

function API.open(path)
  if not path or path == "" then return "err:no_path" end
  reaper.Main_openProject(path)
  return "ok:opening:" .. path
end

function API.action(id)
  local numId = tonumber(id) or reaper.NamedCommandLookup(id)
  if numId and numId ~= 0 then
    reaper.Main_OnCommand(numId, 0)
    return "ok:action:" .. tostring(numId)
  end
  return "err:action_not_found"
end

-- Ejecutar script Lua crudo (con manejo de errores mejorado)
function API.lua(code)
  local func, err = load(code)
  if func then
    local status, res = pcall(func)
    return status and tostring(res or "ok") or "err:runtime:" .. tostring(res)
  end
  return "err:compile:" .. tostring(err)
end

function processCommand(raw)
  raw = raw:gsub("^%s+", ""):gsub("%s+$", "")
  if raw == "" then return end
  
  reaper.ShowConsoleMsg("[Ducer 3.0] Command: " .. raw:sub(1, 100) .. "\n")
  
  local cmd, args = raw:match("^(%w+):?(.*)$")
  if not cmd then cmd = raw end
  
  local response = "err:unknown_cmd"
  if API[cmd] then
    response = API[cmd](args)
  else
    -- Fallback para acciones directas si no es un comando API
    response = API.action(raw)
  end
  
  local f = io.open(RESP_FILE, "w")
  if f then f:write(tostring(response)); f:close() end
end

function mainLoop()
  local f = io.open(CMD_FILE, "r")
  if f then
    local content = f:read("*a")
    f:close()
    if content and content ~= "" then
      local cf = io.open(CMD_FILE, "w"); if cf then cf:close() end
      processCommand(content)
    end
  end
  reaper.defer(mainLoop)
end

-- Limpieza inicial
local f = io.open(CMD_FILE, "w"); if f then f:close() end
f = io.open(RESP_FILE, "w"); if f then f:close() end

reaper.ShowConsoleMsg("[Ducer] Production Assistant Bridge V3.0 (Direct Mode) Active\n")
mainLoop()
