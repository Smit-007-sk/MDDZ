with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r'logo', content, re.IGNORECASE)]
print(f"Found 'logo' occurrences: {len(matches)}")
for offset in matches[:10]:
    print(repr(content[max(0, offset-50):min(len(content), offset+80)]))
    print("-" * 50)
