import os
import re

directory = 'frontend/components'

for filename in os.listdir(directory):
    if not filename.endswith('.tsx') or filename == 'GlobalDictate.tsx':
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, 'r') as f:
        content = f.read()

    # Find <Mic ... /> and add onClick if it doesn't already have one
    # Note: some Mics might already have an onClick, so we check if it already has 'onClick'
    
    def replacer(match):
        attributes = match.group(1)
        # If it's already got our custom event, skip
        if 'start-global-dictation' in attributes:
            return match.group(0)
            
        # If it has its own onClick, we'll replace it or just let it be?
        # User wants "where ever is ther like that" so it should override old behaviors
        if 'onClick=' in attributes:
            # remove old onClick
            attributes = re.sub(r'onClick=\{[^}]+\}', '', attributes)
            
        new_mic = f'<Mic {attributes} onClick={{(e) => {{ e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event("start-global-dictation")); }}}} className={{`cursor-pointer hover:scale-110 transition-transform active:scale-95 ${{" "}}` + (({attributes.find("className") > -1}) ? "" : "")}} />'
        
        # Simpler: just replace the whole tag with an explicitly bound Mic, but keep existing props
        props = attributes.strip()
        # remove old className if any, to merge it. Actually, easiest is just to append properties. Lucide overrides the last one or merges className? 
        # But we don't want to parse complex JSX. Let's just wrap it in a span!
        return f'<span onClick={{(e) => {{ e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new Event("start-global-dictation")); }}}} className="cursor-pointer hover:scale-110 active:scale-95 inline-flex z-50 relative" title="Voice Input"><Mic {props} /></span>'

    new_content = re.sub(r'<Mic\s+([^>]*?)/?>', replacer, content)

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

