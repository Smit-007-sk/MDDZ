# Fix stm.css overlay color
filepaths = [
    'c:/MDDZ/css/sections/stm.css',
    'c:/MDDZ/index.html'
]

for path in filepaths:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Replace background: linear-gradient(to bottom, transparent 0%, #000 100%);
    # and other instances of black gradients in stm
    new_content = content.replace('background: linear-gradient(to bottom, transparent 0%, #000 100%);', 'background: linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%);')
    new_content = new_content.replace('background: linear-gradient(to bottom, transparent 0%, #000000 100%);', 'background: linear-gradient(to bottom, transparent 0%, var(--color-bg) 100%);')
    
    if new_content != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed black gradient in {path}")
