import re
import sys

def find_duplicates(content, lang):
    match = re.search(f"{lang}: \\{{\\n(.*?)\\n    \\}}", content, re.DOTALL)
    if not match:
        # Try a different format if the first regex fails
        match = re.search(f"{lang}: \\{{(.*?)\\n    \\}}", content, re.DOTALL)
        if not match:
            return []
    
    block = match.group(1)
    keys = re.findall(r'^\s*([a-zA-Z0-9_]+):', block, re.MULTILINE)
    
    seen = set()
    dupes = []
    for k in keys:
        if k in seen:
            dupes.append(k)
        seen.add(k)
    return dupes

with open('/Users/kalibabupragada/Downloads/Code/lifeshield-–-ai-personal-tablet-safety-guardian (11)/frontend/core/patientContext/translations.ts', 'r') as f:
    content = f.read()

for lang in ['en', 'te', 'hi', 'ta']:
    dupes = find_duplicates(content, lang)
    if dupes:
        print(f"Duplicates in {lang}: {dupes}")
    else:
        print(f"No duplicates in {lang}")
