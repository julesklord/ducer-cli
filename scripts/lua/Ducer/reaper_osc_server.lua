-- reaper_osc_server.lua
-- Receptor OSC nativo (sin third-party)

function print(msg)
  reaper.ShowConsoleMsg(msg .. "\n")
end

-- Configurar receptor OSC
local port = 8000
local ret = reaper.OscLocal_Init("127.0.0.1", port)

if ret >= 0 then
  print("OSC Server iniciado en puerto " .. port)
else
  print("Error inicializando OSC: " .. ret)
end

-- Procesar mensajes
function onOscMessage(msg)
  local action_id = msg[1]
  if action_id then
    -- Ejecutar acción de REAPER
    reaper.Main_OnCommand(action_id, 0)
    print("Ejecutando acción: " .. action_id)
  end
end

-- Bucle principal
reaper.defer(function()
  local msg = reaper.OscLocal_Recv()
  if msg then
    onOscMessage(msg)
  end
end)
