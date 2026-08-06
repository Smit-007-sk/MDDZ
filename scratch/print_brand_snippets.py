with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
millionaire_matches = [m.start() for m in re.finditer(r'MILLIONAIRE', content)]

for offset in millionaire_matches:
    if offset > 10000:
        snippet = content[max(0, offset-150):min(len(content), offset+150)]
        print(f"Match at {offset}:")
        print(repr(snippet))
        print("-" * 60)
