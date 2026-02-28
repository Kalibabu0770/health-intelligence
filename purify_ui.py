import os
import re

directory = 'frontend/components'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Eliminate dark backgrounds entirely
    new_content = content.replace('bg-emerald-800', 'bg-white border-2 border-emerald-500')
    new_content = new_content.replace('bg-emerald-600', 'bg-emerald-100 border-2 border-emerald-500')
    new_content = new_content.replace('bg-emerald-500', 'bg-emerald-100')
    new_content = new_content.replace('bg-slate-900', 'bg-white border-2 border-slate-300')
    new_content = new_content.replace('bg-slate-800', 'bg-white border-2 border-slate-300')
    new_content = new_content.replace('bg-slate-950', 'bg-white')
    new_content = new_content.replace('bg-black', 'bg-white')

    # 2. Fix text contrast that was lost by removing dark backgrounds
    new_content = new_content.replace('text-white', 'text-slate-900')
    new_content = new_content.replace('text-emerald-100', 'text-emerald-700')
    
    # 3. Clean up borders specifically to maintain grid aesthetic in a light theme
    new_content = new_content.replace('border-slate-800', 'border-slate-200')
    
    # Let's adjust specifically Layout and Dashboard elements that might break
    if filepath.endswith('Layout.tsx'):
        new_content = new_content.replace('border-4 border-emerald-600', 'border-8 border-emerald-100 bg-white')

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for filename in os.listdir(directory):
    if filename.endswith('.tsx') and 'DoctorDashboard' not in filename: # We keep Doctor UI as it is or modify user UI mostly
        process_file(os.path.join(directory, filename))

