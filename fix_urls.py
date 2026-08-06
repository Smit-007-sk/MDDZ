import os

TARGET_DIR = "c:/nud/nud/nudot.com.tw"

def fix_domain(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return
        
    original = content
    # Revert the domain name back to nudot.com.tw so images load from the correct live server
    content = content.replace("mdz.com.tw", "nudot.com.tw")
    
    # Also fix email if it was accidentally changed to mdz.com.tw
    content = content.replace("@mdz.com.tw", "@millionairedizital.com")
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed URLs in {filepath}")

if __name__ == "__main__":
    print("Fixing broken image domains...")
    for root, dirs, files in os.walk(TARGET_DIR):
        if "archive" in root or ".git" in root:
            continue
            
        for file in files:
            if file.endswith('.html') or file.endswith('.js') or file.endswith('.css'):
                fix_domain(os.path.join(root, file))
    print("Done! Images should now load properly.")
