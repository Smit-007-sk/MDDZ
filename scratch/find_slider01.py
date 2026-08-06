with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r'slider01', content, re.IGNORECASE)]
print(f"slider01 occurrences: {len(matches)}")
for offset in matches:
    print(repr(content[max(0, offset-100):min(len(content), offset+300)]))
    print("-" * 50)
