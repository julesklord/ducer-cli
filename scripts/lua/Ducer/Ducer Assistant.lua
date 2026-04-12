-- Ducer Assistant Bridge
local retval, input = reaper.GetUserInputs("Ducer í ¼í¾›ï¸", 1, "Pregunta:", "")
if retval then
  local cmd = 'powershell -Command "openclaw agent --message \'' .. input .. '\'"'
  reaper.ExecProcess(cmd, 0)
end
