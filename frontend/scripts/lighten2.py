import re, sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

# Fix buttons on emerald/blue/red where text should stay white for contrast
# The prior script changed text-white → text-slate-900 everywhere
# but buttons with coloured BGs need text-white restored

fixes = [
    # Emerald primary buttons  → text-white
    (r'(bg-emerald-600[^"]*?)text-slate-900', r'\1text-white'),
    (r'(bg-emerald-700[^"]*?)text-slate-900', r'\1text-white'),
    (r'(bg-emerald-500[^"]*?)text-slate-900', r'\1text-white'),
    # Blue buttons
    (r'(bg-blue-600[^"]*?)text-slate-900', r'\1text-white'),
    (r'(bg-blue-700[^"]*?)text-slate-900', r'\1text-white'),
    (r'(bg-blue-500[^"]*?)text-slate-900', r'\1text-white'),
    # Red / rose buttons
    (r'(bg-red-600[^"]*?)text-slate-900', r'\1text-white'),
    (r'(bg-rose-600[^"]*?)text-slate-900', r'\1text-white'),
    # Slate-800 / 900 buttons (intentional accents like submit)
    # These are now bg-white so their text should revert
    # The login screen dark card bg should stay, so leave login alone

    # Fix: bg-gradient-to-r from-emerald with text-slate-900 → text-white
    (r'(from-emerald-[56][0-9][0-9][^"]*?)text-slate-900', r'\1text-white'),

    # Large "Execute" / submit buttons that were bg-white (formerly black)
    # These become explicit light style → emerald button
    (r'bg-white text-slate-900 py-7 rounded-\[2\.5rem\]',
     'bg-emerald-600 text-white py-7 rounded-[2.5rem]'),

    # The "Analyze" / big CTA buttons that turned bg-white
    (r'hover:bg-slate-100 transition-all group overflow-hidden relative\b',
     'hover:bg-emerald-700 transition-all group overflow-hidden relative'),
]

result = src
for pattern, repl in fixes:
    result = re.sub(pattern, repl, result)

# Also fix login screen: restore the dark gradient background for the auth screen
# The auth screen has a specific outer div that was bg-slate-950 → now bg-white
# Identify by the "min-h-screen flex items-center justify-center" pattern
result = result.replace(
    'className="min-h-screen flex items-center justify-center bg-white',
    'className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)

print("Phase 2 fixes applied.")
