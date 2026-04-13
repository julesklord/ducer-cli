-- ducer_bridge_listener.lua
-- Instalar en REAPER via Actions > Load ReaScript
-- Corre como script Background en REAPER

local scripts_dir = reaper.GetResourcePath() .. "/Scripts/"
local cmd_file = scripts_dir .. "ducer_commands.txt"
local resp_file = scripts_dir .. "ducer_response.txt"

local function read_file(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local content = f:read("*all")
  f:close()
  return content
end

local function write_file(path, content)
  local f = io.open(path, "w")
  if f then f:write(content); f:close() end
end

local function process_command(cmd)
  if cmd:sub(1, 7) == "action:" then
    local id = cmd:sub(8)
    local id_num = tonumber(id)
    if id_num then
      reaper.Main_OnCommand(id_num, 0)
      write_file(resp_file, "OK:action:" .. id)
    else
      local resolved = reaper.NamedCommandLookup(id)
      if resolved ~= 0 then
        reaper.Main_OnCommand(resolved, 0)
        write_file(resp_file, "OK:action:" .. id)
      else
        write_file(resp_file, "ERROR:unknown_action:" .. id)
      end
    end

  elseif cmd:sub(1, 4) == "lua:" then
    local code = cmd:sub(5)
    local fn, err = load(code)
    if fn then
      local ok, result = pcall(fn)
      if not ok then
        write_file(resp_file, "LUA_ERROR:" .. tostring(result))
      end
      -- La respuesta ya fue escrita por el propio código Lua (en validateAction)
      -- Si no escribió nada, escribir OK
      local current = read_file(resp_file)
      if not current or current == "" then
        write_file(resp_file, "LUA_OK")
      end
    else
      write_file(resp_file, "LUA_PARSE_ERROR:" .. tostring(err))
    end

  elseif cmd == "status" then
    local play_state = reaper.GetPlayState()
    local cursor = reaper.GetPlayPosition()
    local proj_path = reaper.GetProjectPath("")
    local version = reaper.GetAppVersion()
    write_file(
      resp_file,
      string.format("v:%s|state:%d|cursor:%.4f|proj:%s", version, play_state, cursor, proj_path)
    )

  else
    write_file(resp_file, "ERROR:unknown_command:" .. cmd)
  end
end

-- Loop principal (corre como background script)
local function main()
  local cmd = read_file(cmd_file)
  if cmd and cmd ~= "" then
    write_file(cmd_file, "") -- limpiar
    process_command(cmd:match("^%s*(.-)%s*$")) -- trim
  end
  reaper.defer(main)
end

main()
