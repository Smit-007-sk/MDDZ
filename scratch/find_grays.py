import os
import re

# Find any hex colors or rgba that look gray
# Grays usually have R=G=B (or very close) or are named gray/grey.
# Let's inspect the files in css/ and index.html

files = [
    'c:/MDDZ/index.html',
    'c:/MDDZ/css/variables.css',
    'c:/MDDZ/css/global.css',
    'c:/MDDZ/css/sections/hero.css',
    'c:/MDDZ/css/sections/scs.css',
    'c:/MDDZ/css/sections/stm.css',
    'c:/MDDZ/css/sections/core-capabilities.css',
    'c:/MDDZ/css/sections/gallery.css',
    'c:/MDDZ/css/sections/footer.css',
    'c:/MDDZ/css/sections/loader.css',
    'c:/MDDZ/css/sections/nav.css'
]

# We want to find:
# 1. Hex codes like #a0a0a0, #888, #5a544d, #aaa, #ccc, #eee, etc.
# 2. rgba(X, X, X, Y) where R=G=B (or close)
# 3. Words 'gray', 'grey'

gray_pattern = re.compile(
    r'(#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[0-9.]+\s*)?\)|gray|grey)',
    re.IGNORECASE
)

def is_gray(color_str):
    color_str = color_str.lower().strip()
    if 'gray' in color_str or 'grey' in color_str:
        return True
    if color_str.startswith('#'):
        hex_val = color_str[1:]
        if len(hex_val) == 3:
            return hex_val[0] == hex_val[1] == hex_val[2]
        if len(hex_val) == 6:
            return hex_val[0:2] == hex_val[2:4] == hex_val[4:6]
    if color_str.startswith('rgb'):
        # Extract numbers
        nums = [int(n) for n in re.findall(r'\d+', color_str)[:3]]
        if len(nums) == 3:
            # If standard deviation is very small, it's gray
            avg = sum(nums) / 3
            variance = sum((x - avg) ** 2 for x in nums) / 3
            return variance < 10 # Allow very minor variations
    return False

for filepath in files:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    found = []
    for idx, line in enumerate(lines):
        matches = gray_pattern.findall(line)
        for m in matches:
            if is_gray(m):
                found.append((idx + 1, m, line.strip()))
    
    if found:
        print(f"File: {filepath} ({len(found)} grays)")
        for line_num, color, snippet in found[:15]:
            print(f"  Line {line_num}: {color} -> {snippet}")
        if len(found) > 15:
            print("  ...")
        print("-" * 50)
