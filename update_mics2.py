import os
import re

directory = 'frontend/components'

for filename in os.listdir(directory):
    if not filename.endswith('.tsx') or filename == 'GlobalDictate.tsx':
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # We previously replaced <Mic> with <span ...><Mic /></span>. 
    # Let's find those spans and upgrade the event payload.
    
    # Actually, it's easier to just find the exact string we inserted.
    old_string = 'window.dispatchEvent(new Event("start-global-dictation"));'
    new_string = 'window.dispatchEvent(new CustomEvent("start-global-dictation", { detail: { target: e.currentTarget } }));'
    
    if old_string in content:
        new_content = content.replace(old_string, new_string)
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

