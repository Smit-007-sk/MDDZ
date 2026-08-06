with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

for idx, line in enumerate(content.split('\n')):
    if '#efe6d8' in line:
        print(f"Line {idx+1}: {line.strip()}")
