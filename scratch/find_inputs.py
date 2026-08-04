import re

with open('telausuarios.html', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

for i, l in enumerate(lines, 1):
    if 'id=' in l and ('input' in l or 'empresa' in l or 'provedor' in l or 'quantidade' in l or 'lote' in l or 'cnpj' in l or 'posto' in l):
        print(f"L{i}: {l.strip()[:110]}")
