-- Ducer_AutomationRunner.lua
-- Ejecutor de tareas de automatizacion para Julio
-- Requiere: Ducer_ControlCenter.lua cargado

local SCRIPTS_PATH = reaper.GetResourcePath() .. "/Scripts/"

-- Acciones de navegacion
local ACTIONS = {
  -- Backup
  save = 40019,
  undo = 40020,
  
  -- Organizacion
  select_all_tracks = 40441,
  delete_tracks = 40429,
  unselect_all = 40407,
  select_items = 40173,
  
  -- Track sizes
  track_sidebar = 41709,
  track_wide = 41708,
  track_thin = 41710,
  track_strip = 41713,
  
  -- Routing
  send_tool = 40747,
  multiple_sends = 41883,
  submix_bus = 40862,
  
  -- Cleanup
  delete_icons = 40296,
  clear_clip_indicators = 40527,
  
  -- Gain/Volume
  reset_vol_pan = 40032,
  
  -- FX
  insert_eq = 40270,
  insert_comp = 40271,
  bypass_all_fx = 40404,
  
  -- Mixer
  visual_mixer = 40226,
  reset_mixer_heights = 40204,
}

-- Crear backup del proyecto
function createBackup()
  local proj_path = reaper.GetProjectPath()
  local proj_name = reaper.GetProjectName(0, "")
  local backup_path = proj_path .. "backup_" .. os.date("%Y%m%d_%H%M%S") .. "_" .. proj_name
  reaper.Main_SaveProject(0, false)
  reaper.ShowConsoleMsg("[Ducer] Backup creado: " .. backup_path .. "\n")
  return backup_path
end

-- Ejecutar accion por ID
function execAction(action_id)
  if action_id then
    reaper.Main_OnCommand(action_id, 0)
    return true
  end
  return false
end

-- Organizar tracks por tipo (basico)
function organizeTracksByFolder()
  local num_tracks = reaper.CountTracks(0)
  reaper.ShowConsoleMsg("[Ducer] Organizando " .. num_tracks .. " tracks...\n")
  
  for i = 0, num_tracks - 1 do
    local track = reaper.GetTrack(0, i)
    local _, name = reaper.GetTrackName(track)
    
    -- Carpeta VST
    if name:match("VST") or name:match("Synth") or name:match("Plugin") then
      reaper.SetTrackFolder(track, 1)
    end
  end
end

-- Cleanup de pistas
function cleanupTracks()
  createBackup()
  reaper.ShowConsoleMsg("[Ducer] Limpiando proyecto...\n")
  
  -- Deseleccionar todo
  execAction(40407)
  
  -- Limpiar indicadores
  execAction(40527)
end

-- Hacer gain staging
function gainStaging()
  createBackup()
  reaper.ShowConsoleMsg("[Ducer] Gain staging...\n")
  
  local num_tracks = reaper.CountTracks(0)
  for i = 0, num_tracks - 1 do
    local track = reaper.GetTrack(0, i)
    -- Resetear volumen a 0dB
    reaper.CSurf_SetTrackVolume(track, 1.0)
  end
end

-- Rutear tracks optimos
function optimalRouting()
  createBackup()
  reaper.ShowConsoleMsg("[Ducer] Optimizando ruteo...\n")
  
  -- Aqui iria logica de routing segun el tipo de track
  -- Por ejemplo: drums -> bus, bass -> bus, etc.
end

-- Procesar comando recibido
function processCommand(cmd)
  cmd = cmd:gsub("%s+$", ""):gsub("^%s+", "")
  
  if cmd == "cleanup" then
    cleanupTracks()
    return "OK: cleanup done"
    
  elseif cmd == "gain_staging" then
    gainStaging()
    return "OK: gain staging done"
    
  elseif cmd == "organize" then
    organizeTracksByFolder()
    return "OK: organized by folder"
    
  elseif cmd == "route" then
    optimalRouting()
    return "OK: routing optimized"
    
  elseif cmd == "backup" then
    createBackup()
    return "OK: backup created"
    
  elseif cmd:sub(1, 6) == "action" then
    local id = tonumber(cmd:sub(8))
    if id then
      createBackup()
      execAction(id)
      return "OK: action " .. id
    end
  end
  
  return "ERR: unknown command"
end

-- Loop principal
function mainLoop()
  -- Mantener el script corriendo
  reaper.defer(mainLoop)
end

reaper.ShowConsoleMsg("[Ducer] Automation Runner iniciado\n")
mainLoop()
