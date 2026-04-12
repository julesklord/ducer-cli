import subprocess
import sys

# Obtener input del usuario via REAPER
input_text = sys.argv[1] if len(sys.argv) > 1 else "status"

# Mandar mensaje a OpenClaw gateway
result = subprocess.run(
    ["openclaw", "agent", "--message", input_text],
    capture_output=True,
    text=True,
    encoding="utf-8"
)

print(result.stdout)