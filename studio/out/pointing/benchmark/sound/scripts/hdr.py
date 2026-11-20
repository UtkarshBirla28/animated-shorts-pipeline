import os
from pathlib import Path
cu = Path(os.path.expanduser("~/.cache/pt_cuda12/nvidia"))
if cu.exists():
    for b in cu.glob("*/bin"):
        os.environ["PATH"] = str(b) + os.pathsep + os.environ.get("PATH", "")
        try: os.add_dll_directory(str(b))
        except OSError: pass
