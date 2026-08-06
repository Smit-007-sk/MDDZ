with open('c:/MDDZ/css/sections/nav.css', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
# Find all selectors that look like classes or IDs
selectors = re.findall(r'([.#][\w-][^{]*)\{', content)
print("Selectors in nav.css:")
for s in selectors[:50]:
    print("  ", s.strip())
