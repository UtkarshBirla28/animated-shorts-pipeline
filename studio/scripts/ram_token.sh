#!/usr/bin/env bash
# Shared RAM token between Claude sessions on this 16 GB PC (owner's rule, 2026-11-18): take turns on heavy renders.
#   source scripts/ram_token.sh; ram_take "<job>"   -> waits while the OTHER session holds the token, then takes it
#   ram_release                                      -> deletes the token if it is ours
# Token file: C:\Users\utkar\Desktop\RAM_TOKEN.txt, one line "<session> <job> <start time>". A token older than
# 100 minutes is treated as stale. Light work never needs it. Nobody kills the other session's processes.
RAM_TOKEN="/c/Users/utkar/Desktop/RAM_TOKEN.txt"
RAM_ME="${RAM_ME:-clown}"
ram_free_gb() { powershell.exe -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" 2>/dev/null | tr -d '\r'; }
ram_take() {
  local job="$1" waited=0
  while [ -f "$RAM_TOKEN" ]; do
    local owner age
    owner=$(cut -d' ' -f1 "$RAM_TOKEN" 2>/dev/null)
    age=$(( ( $(date +%s) - $(stat -c %Y "$RAM_TOKEN" 2>/dev/null || echo 0) ) / 60 ))
    if [ "$owner" = "$RAM_ME" ] || [ "$age" -ge 100 ]; then break; fi
    if [ $((waited % 10)) -eq 0 ]; then echo "ram_token: held by '$owner' for ${age} min; waiting ($(date +%H:%M))"; fi
    sleep 60; waited=$((waited + 1))
  done
  echo "$RAM_ME $job $(date '+%Y-%m-%d %H:%M:%S')" > "$RAM_TOKEN"
  echo "ram_token: taken by $RAM_ME for '$job' (free RAM $(ram_free_gb) GB)"
}
ram_release() {
  if [ -f "$RAM_TOKEN" ] && [ "$(cut -d' ' -f1 "$RAM_TOKEN" 2>/dev/null)" = "$RAM_ME" ]; then rm -f "$RAM_TOKEN"; echo "ram_token: released by $RAM_ME"; fi
}
