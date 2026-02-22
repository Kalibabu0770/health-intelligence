import re, sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    src = f.read()

replacements = [
    # ── Backgrounds: dark → light ──────────────────────────────────────────
    # slate-950 variants
    (r'\bbg-slate-950\b',         'bg-white'),
    (r'\bbg-slate-950/60\b',      'bg-slate-100/60'),
    (r'\bbg-slate-950/80\b',      'bg-slate-100/80'),

    # slate-900 variants
    (r'\bbg-slate-900\b',         'bg-white'),
    (r'\bbg-slate-900/80\b',      'bg-slate-100/80'),
    (r'\bbg-slate-900/60\b',      'bg-slate-100/60'),
    (r'\bbg-slate-900/20\b',      'bg-slate-200/20'),
    (r'\bbg-slate-900/10\b',      'bg-slate-100/10'),

    # slate-800
    (r'\bbg-slate-800\b',         'bg-slate-100'),
    (r'\bbg-slate-800/60\b',      'bg-slate-200/60'),

    # plain black backgrounds
    (r'\bbg-black\b',             'bg-slate-100'),
    (r'\bbg-black/10\b',          'bg-slate-200/10'),
    (r'\bbg-black/20\b',          'bg-slate-200/20'),
    (r'\bbg-black/30\b',          'bg-slate-200/30'),

    # ── Borders: dark → light ──────────────────────────────────────────────
    (r'\bborder-slate-900\b',     'border-slate-200'),
    (r'\bborder-slate-800\b',     'border-slate-200'),
    (r'\bborder-slate-950\b',     'border-slate-200'),
    (r'\bborder-white/5\b',       'border-slate-100'),
    (r'\bborder-white/10\b',      'border-slate-100'),
    (r'\bborder-white/20\b',      'border-slate-200'),

    # ── Text: white in formerly-dark cards → dark ─────────────────────────
    # "text-white" on its own (inside className strings)
    # We do this carefully: only in Tailwind className contexts
    (r'\btext-white\b',           'text-slate-900'),

    # white opacity variants used in dark cards
    (r'\btext-white/90\b',        'text-slate-800'),
    (r'\btext-white/80\b',        'text-slate-700'),
    (r'\btext-white/70\b',        'text-slate-600'),
    (r'\btext-white/60\b',        'text-slate-500'),
    (r'\btext-white/50\b',        'text-slate-500'),
    (r'\btext-white/40\b',        'text-slate-400'),
    (r'\btext-white/30\b',        'text-slate-400'),
    (r'\btext-white/20\b',        'text-slate-300'),
    (r'\btext-white/10\b',        'text-slate-200'),

    # ── White opacity BACKGROUNDS used in dark cards → light equivalents ──
    (r'\bbg-white/5\b',           'bg-slate-50'),
    (r'\bbg-white/10\b',          'bg-slate-100'),
    (r'\bbg-white/15\b',          'bg-slate-100'),
    (r'\bbg-white/20\b',          'bg-slate-100'),
    (r'\bbg-white/30\b',          'bg-slate-100'),

    # ── Top nav header: dark teal → white card header ─────────────────────
    (r"bg-\[#075e54\]",           'bg-white'),
    (r"bg-red-800",               'bg-red-50'),

    # ── Sidebar profile avatar dark bg ─────────────────────────────────────
    (r'\bbg-slate-900 rounded-full\b', 'bg-emerald-600 rounded-full'),

    # ── Hover: hover:bg-black → slate ─────────────────────────────────────
    (r'\bhover:bg-black\b',       'hover:bg-slate-100'),

    # ── Active: active:bg-black → slate ───────────────────────────────────
    (r'\bactive:bg-black\b',      'active:bg-slate-200'),
]

result = src
for pattern, repl in replacements:
    result = re.sub(pattern, repl, result)

with open(path, 'w', encoding='utf-8') as f:
    f.write(result)

print(f"Done. Applied {len(replacements)} replacement rules.")
