with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r'id="fixed-logo"', content)]

output = []
for offset in matches:
    output.append(content[max(0, offset-200):min(len(content), offset+600)])

with open('c:/MDDZ/scratch/fixed_logo_out.txt', 'w', encoding='utf-8') as f:
    for out in output:
        f.write(out + '\n' + '='*50 + '\n')

print("Saved output to c:/MDDZ/scratch/fixed_logo_out.txt")
