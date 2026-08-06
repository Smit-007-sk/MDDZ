with open('c:/MDDZ/css/sections/nav.css', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
selectors = re.findall(r'([.#][\w-][^{]*)\{', content)

with open('c:/MDDZ/scratch/selectors_out.txt', 'w', encoding='utf-8') as f:
    for s in selectors:
        f.write(s.strip() + '\n')

print("Saved selectors to c:/MDDZ/scratch/selectors_out.txt")
