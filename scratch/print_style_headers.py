with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', content, re.DOTALL | re.IGNORECASE)

for idx, style in enumerate(style_blocks):
    lines = style.strip().split('\n')
    print(f"Style block {idx}:")
    for line in lines[:8]:
        if line.strip():
            print("  ", line.strip())
