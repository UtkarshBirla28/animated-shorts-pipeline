"""pt_probe.py on SCRIPT v3 takes (pt3_lib adds the v3 line ids to pt_lib.TEXT first).
  python pt3_probe.py <takes subfolder> [more ...] [--force]"""
import pt3_lib  # noqa: F401  (adds the v3 lines)
import pt_probe

if __name__ == "__main__":
    pt_probe.main()
