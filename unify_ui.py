import os
import re

directory = 'frontend/components'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Apply strict grid UI constraints
    new_content = re.sub(r'rounded-\[.*?rem\]', 'rounded-xl', content)
    new_content = re.sub(r'rounded-3xl', 'rounded-xl', new_content)
    new_content = re.sub(r'rounded-2xl', 'rounded-xl', new_content)
    new_content = re.sub(r'backdrop-blur-\w+', '', new_content)
    
    # Replace random colors to unify on Deep Medical Green (emerald) and Mint (emerald-50)
    # Be careful not to replace text-/bg-emerald directly
    new_content = new_content.replace('bg-indigo-50 ', 'bg-emerald-50 ')
    new_content = new_content.replace('text-indigo-600', 'text-emerald-600')
    new_content = new_content.replace('text-indigo-500', 'text-emerald-500')
    new_content = new_content.replace('border-indigo-100', 'border-emerald-100')
    new_content = new_content.replace('bg-blue-50 ', 'bg-emerald-50 ')
    new_content = new_content.replace('text-blue-600', 'text-emerald-600')
    
    # Force primary headers/blocks to use emerald
    # e.g. Dashboard big active black block bg-slate-900 -> bg-emerald-800
    new_content = new_content.replace('bg-slate-900', 'bg-emerald-800')

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filename in os.listdir(directory):
    if filename.endswith('.tsx'):
        process_file(os.path.join(directory, filename))

