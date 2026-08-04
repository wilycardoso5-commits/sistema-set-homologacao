import re

text = """Provider - 4339
EMPRESA EXEMPLO LTDA
01.02.1234567-1  FUNCIONARIO UM
01.02.1234567-2  FUNCIONARIO DOIS
--- PÁGINA 2 ---
SET - SISTEMA DE TRANSPORTE
Nº Cartão  Nome Funcionário
01.02.1234567-3  FUNCIONARIO TRES
01.02.1234567-4  FUNCIONARIO QUATRO
"""

print("=== OLD LOGIC ===")
regexCartoes = r'(\d{2}\.\d{2}\.\d{7,8}-\d)\s+([\s\S]+?)(?=(?:\d{2}\.\d{2}\.\d{7,8}-\d)|$)'
for m in re.finditer(regexCartoes, text):
    cartao = m.group(1)
    func_text = m.group(2)
    func_text = re.sub(r'--- PÁGINA \d+ ---', '', func_text, flags=re.I)
    linesFunc = [l.strip() for l in func_text.split('\n') if l.strip()]
    first_line = linesFunc[0] if linesFunc else ''
    first_line = first_line.split('  ')[0].strip()
    print(f"Cartao: {cartao} -> Nome Extrato: '{first_line}'")

print("\n=== NEW ROBUST LOGIC ===")
for m in re.finditer(regexCartoes, text):
    cartao = m.group(1)
    func_text = m.group(2)
    # Clean page headers & structural titles
    func_text = re.sub(r'--- PÁGINA \d+ ---', '', func_text, flags=re.I)
    func_text = re.sub(r'Nº\s*Cartão|Nome\s*Funcionário|Funcionário|Nome|Assinatura|SET|SISTEMA|TRANSPORTE|Relatório|Provider.*$', '', func_text, flags=re.I)
    linesFunc = [l.strip() for l in func_text.split('\n') if l.strip() and len(l.strip()) > 1]
    name = linesFunc[0] if linesFunc else 'Funcionário Não Identificado'
    name = re.split(r'\s{2,}', name)[0].strip()
    print(f"Cartao: {cartao} -> Nome Extrato: '{name}'")
