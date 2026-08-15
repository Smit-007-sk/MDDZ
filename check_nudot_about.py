import re

with open('c:/MDDZ/millionaire-dizital-structured/about.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check for remaining Chinese characters
cjk_re = re.compile(r'[\u4e00-\u9fff]+')
cjk_matches = []
for line_idx, line in enumerate(html.splitlines(), 1):
    if cjk_re.search(line):
        cjk_matches.append(line_idx)

# Check for NUDOT
nudot_matches = []
for line_idx, line in enumerate(html.splitlines(), 1):
    if 'nudot' in line.lower():
        nudot_matches.append(line_idx)

print(f"Remaining CJK (Chinese) matches at lines: {cjk_matches}")
print(f"Remaining Nudot matches at lines: {nudot_matches}")
