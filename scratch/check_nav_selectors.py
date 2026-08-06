with open('c:/MDDZ/css/sections/nav.css', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
# Find any hex colors or variables in nav.css
colors = re.findall(r'#\w{3,6}|rgba?\([^)]+\)', content)
print("Colors in nav.css:")
for c in set(colors):
    print("  ", c)
