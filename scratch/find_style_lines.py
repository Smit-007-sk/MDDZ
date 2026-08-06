with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

in_style = False
style_start = -1
for idx, line in enumerate(lines):
    if '<style>' in line or '<style ' in line:
        print(f"Style start at line {idx+1}: {line.strip()}")
    elif '</style>' in line:
        print(f"Style end at line {idx+1}")
