with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Search for MILLIONAIRE and DIZITAL in HTML content
import re
millionaire_matches = [m.start() for m in re.finditer(r'MILLIONAIRE', content)]
dizital_matches = [m.start() for m in re.finditer(r'DIZITAL', content)]

print(f"MILLIONAIRE found at offsets: {millionaire_matches}")
print(f"DIZITAL found at offsets: {dizital_matches}")

# Let's print snippets around the first few matches
for offset in millionaire_matches[:5]:
    print("MILLIONAIRE snippet:")
    print(content[max(0, offset-100):min(len(content), offset+100)])
    print("-" * 40)

for offset in dizital_matches[:5]:
    print("DIZITAL snippet:")
    print(content[max(0, offset-100):min(len(content), offset+100)])
    print("-" * 40)
