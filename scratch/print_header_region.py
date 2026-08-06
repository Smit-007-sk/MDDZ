with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
millionaire_matches = [m.start() for m in re.finditer(r'MILLIONAIRE', content)]

# Find match closest to 135501
match_idx = -1
for idx in millionaire_matches:
    if abs(idx - 135501) < 100:
        match_idx = idx
        break

if match_idx != -1:
    snippet = content[max(0, match_idx-400):min(len(content), match_idx+1200)]
    print(repr(snippet))
