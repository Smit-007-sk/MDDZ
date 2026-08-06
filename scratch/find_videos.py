with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

import re
matches = [m.start() for m in re.finditer(r'<video', content, re.IGNORECASE)]
print(f"Video tags: {len(matches)}")

output = []
for offset in matches:
    output.append(content[max(0, offset-50):min(len(content), offset+350)])

with open('c:/MDDZ/scratch/video_tags.txt', 'w', encoding='utf-8') as f:
    for out in output:
        f.write(out + '\n' + '='*50 + '\n')

print("Saved output to c:/MDDZ/scratch/video_tags.txt")
