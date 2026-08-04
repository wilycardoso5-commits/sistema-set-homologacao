import re

# Simulate PDF where only Page 1 has "Provider - 14", while Page 2 & Page 3 only have Page Headers
page1 = """Provider - 14
ARMAZEM BR
""" + "\n".join([f"01.02.00000{i:02d}-1  FUNCIONARIO {i}" for i in range(1, 38)]) + "\n--- PÁGINA 1 ---\n"

page2 = """SET - SISTEMA DE TRANSPORTE
Relatório de Entrega de Cartões
Nº Cartão  Nome Funcionário
""" + "\n".join([f"01.02.00000{i:02d}-1  FUNCIONARIO {i}" for i in range(38, 75)]) + "\n--- PÁGINA 2 ---\n"

page3 = """SET - SISTEMA DE TRANSPORTE
Relatório de Entrega de Cartões
Nº Cartão  Nome Funcionário
""" + "\n".join([f"01.02.00000{i:02d}-1  FUNCIONARIO {i}" for i in range(75, 101)]) + "\n--- PÁGINA 3 ---\n"

fullText = page1 + page2 + page3

def parsePDFText_sim(text):
    results = {}
    blocos = re.split(r'Provider\s*[-:]?', text, flags=re.I)
    print(f"Total blocks from split: {len(blocos)}")
    
    for i in range(1, len(blocos)):
        bloco = blocos[i].strip()
        provedorMatch = re.match(r'^\s*(\d+)', bloco)
        if not provedorMatch:
            print(f"Block {i} failed provedorMatch!")
            continue
        provedor = provedorMatch.group(1).strip()
        
        regexCartoesValida = r'(\d{2}\.\d{2}\.\d{7,8}-\d)'
        if not re.search(regexCartoesValida, bloco):
            continue
            
        firstCardMatch = re.search(regexCartoesValida, bloco)
        headerText = bloco[len(provedorMatch.group(0)):firstCardMatch.start()].strip()
        lines = [l.strip() for l in headerText.split('\n') if l.strip()]
        empresa = lines[0] if lines else "Empresa Importada"
        
        if provedor not in results:
            results[provedor] = {"empresa": empresa, "funcionarios": []}
            
        regexCartoes = r'(\d{2}\.\d{2}\.\d{7,8}-\d)\s+([\s\S]+?)(?=(?:\d{2}\.\d{2}\.\d{7,8}-\d)|$)'
        for match in re.finditer(regexCartoes, bloco):
            cartao = match.group(1)
            func = match.group(2)
            func = re.sub(r'--- PÁGINA \d+ ---', '', func, flags=re.I)
            func = re.sub(r'Nº\s*Cartão|Nome\s*Funcionário|Funcionário|Nome|Assinatura|SET|SISTEMA|TRANSPORTE|Relatório', '', func, flags=re.I)
            linesFunc = [l.strip() for l in func.split('\n') if l.strip()]
            name = linesFunc[0] if linesFunc else ''
            if name:
                if not any(f['cartao'] == cartao for f in results[provedor]['funcionarios']):
                    results[provedor]['funcionarios'].append({"nome": name, "cartao": cartao})
                    
    return results

res = parsePDFText_sim(fullText)
for prov, data in res.items():
    print(f"Provider {prov}: Empresa='{data['empresa']}', Total Funcionarios={len(data['funcionarios'])}")
