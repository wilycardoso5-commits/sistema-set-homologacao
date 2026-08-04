def parse_csv_line(line):
    # Splits handling quotes
    parts = []
    curr = ""
    in_quotes = False
    delim = ';' if (';' in line and ',' not in line) else (',' if ',' in line else '\t')
    
    for c in line:
        if c == '"':
            in_quotes = not in_quotes
        elif c == delim and not in_quotes:
            parts.append(curr.strip().strip('"').strip())
            curr = ""
        else:
            curr += c
    parts.append(curr.strip().strip('"').strip())

    # Check for 'Provider' in parts (Crystal Reports format)
    provider_idx = -1
    for idx, p in enumerate(parts):
        if p.lower() == 'provider':
            provider_idx = idx
            break

    if provider_idx != -1:
        # Crystal Reports format
        # parts[provider_idx] = "Provider"
        # parts[provider_idx+1] = Provider ID (ex: "2")
        # parts[provider_idx+2] = Separator "-" or Empresa Name
        # parts[provider_idx+3] = Empresa Name
        # parts[provider_idx+4] = Label (ex: "Nº Cartão")
        # parts[provider_idx+5] = Funcionario Name (ex: "TESTE IMPRESSORA REMOTA")
        # parts[provider_idx+6] = Cartao (ex: "54.04.00366987-1")
        if provider_idx + 1 < len(parts):
            prov_id = parts[provider_idx + 1]
            
            # Find empresa name
            empresa = ""
            if provider_idx + 3 < len(parts) and parts[provider_idx + 2] == '-':
                empresa = parts[provider_idx + 3]
            elif provider_idx + 2 < len(parts):
                empresa = parts[provider_idx + 2]

            # Find funcionario name and cartao
            func_nome = ""
            cartao = ""
            
            # Look ahead for Cartao or Funcionario
            rem_parts = parts[provider_idx + 3:] if parts[provider_idx + 2] == '-' else parts[provider_idx + 2:]
            # Filter out label if present
            clean_rem = [p for p in rem_parts if p.lower() not in ['provider', '-', 'nº cartão', 'nº cartao', 'cartao', 'cartão']]
            
            if len(clean_rem) >= 3:
                empresa = clean_rem[0]
                func_nome = clean_rem[1]
                cartao = clean_rem[2]
            elif len(clean_rem) == 2:
                func_nome = clean_rem[0]
                cartao = clean_rem[1]

            return {
                'providerId': prov_id,
                'empresa': empresa,
                'nome': func_nome,
                'cartao': cartao
            }

    # Standard 4-column format: "2,PRODATA MOBILITY BRASIL,TESTE IMPRESSORA REMOTA,54.04.00366987-1"
    if len(parts) >= 4 and parts[0].isdigit():
        return {
            'providerId': parts[0],
            'empresa': parts[1],
            'nome': parts[2],
            'cartao': parts[3]
        }

    return None

# Test samples
lines = [
    'Header 1, Page 1, Date 2026-08-03, Provider, 2, -, PRODATA MOBILITY BRASIL, Nº Cartão, TESTE IMPRESSORA REMOTA, 54.04.00366987-1, Footer data',
    '"2","PRODATA MOBILITY BRASIL","TESTE IMPRESSORA REMOTA","54.04.00366987-1"',
    '2,PRODATA MOBILITY BRASIL,TESTE IMPRESSORA REMOTA,54.04.00366987-1',
    '<html><body>Some HTML block</body></html>'
]

for l in lines:
    res = parse_csv_line(l)
    print(f"Line: {l[:50]}...\n  -> Result: {res}\n")
