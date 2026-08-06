with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r'>MDZ<', content)]
for offset in matches:
    print(repr(content[max(0, offset-200):min(len(content), offset+200)]))
    print("-" * 50)
