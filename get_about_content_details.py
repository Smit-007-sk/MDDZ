import re

with open('c:/MDDZ/millionaire-dizital-structured/about.html', 'r', encoding='utf-8') as f:
    html = f.read()

output = []
for keyword in ['Globally deployed', 'Meet the Founders', '0&thinsp;YEARS', 'Zero vanity']:
    output.append(f"=== SEARCH: {keyword} ===")
    matches = [m.start() for m in re.finditer(re.escape(keyword), html)]
    for pos in matches:
        start_pos = max(0, pos - 500)
        end_pos = min(len(html), pos + 1000)
        output.append(html[start_pos:end_pos])
        output.append("\n" + "="*40 + "\n")

with open('c:/MDDZ/about_content_blocks.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(output))

print("Completed, saved output to c:/MDDZ/about_content_blocks.txt")
