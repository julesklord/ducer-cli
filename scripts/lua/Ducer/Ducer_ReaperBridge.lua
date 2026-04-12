-- Ducer_ReaperBridge.lua
-- Bridge para recibir comandos de Ducer via TCP

local PORT = 8765
local debug = true

function log(msg)
  if debug then
    reaper.ShowConsoleMsg("[Ducer] " .. tostring(msg) .. "\n")
  end
end

local socket = require("socket")
local server = assert(socket.tcp())
server:setoption("reuseaddr", true)
server:setoption("no-delay", true)
server:bind("*", PORT)
server:listen(1)

log("Bridge TCP iniciado en puerto " .. PORT)
log("Esperando comandos de Ducer...")

function processCommand(cmd)
  cmd = cmd:gsub("%s+$", "")
  log("Comando recibido: " .. cmd)
  
  local action_id = tonumber(cmd)
  
  if action_id then
    reaper.Main_OnCommand(action_id, 0)
    log("Accion ejecutada: " .. action_id)
    return "OK: " .. action_id
  elseif cmd:sub(1, 7) == "project" then
    local proj_path = cmd:sub(9)
    if proj_path and proj_path ~= "" then
      reaper.Main_openProject(proj_path)
      log("Proyecto abierto: " .. proj_path)
      return "OK: project loaded"
    end
  elseif cmd:sub(1, 7) == "command" then
    local cmd_id = tonumber(cmd:sub(9))
    if cmd_id then
      reaper.Main_OnCommand(cmd_id, 0)
      return "OK: command " .. cmd_id
    end
  else
    log("Comando desconocido: " .. cmd)
    return "ERR: unknown command"
  end
  
  return "OK"
end

function mainLoop()
  server:settimeout(0.01)
  local client = server:accept()
  
  if client then
    client:settimeout(5)
    local line, err = client:receive("*l")
    if line and not err then
      local response = processCommand(line)
      client:send(response .. "\n")
    end
    client:close()
  end
  
  reaper.defer(mainLoop)
end

mainLoop()