import os
import re

TARGET_DIR = "c:/nud/nud/nudot.com.tw"
BASE_URL = "https://nudot.com.tw/"

def fix_media_urls(content):
    def replacer(match):
        attr = match.group(1)
        path = match.group(2)
        # Skip absolute URLs or empty
        if path.startswith("http") or path.startswith("data:") or path == "":
            return match.group(0)
            
        if path.startswith("images/") or path.startswith("css/") or path.startswith("js/") or path.startswith("videos/") or path.startswith("section-2/"):
            return f'{attr}="{BASE_URL}{path}"'
        return match.group(0)
    
    # Added data-video and data-mobile-video to regex
    content = re.sub(r'(src|data-src|data-image|data-mobile-image|data-video|data-mobile-video|data-thumb|data-mobile-thumb|data-defer-src|data-bg|href)="([^"]+)"', replacer, content)
    return content

def remove_chinese(content):
    return re.sub(r'[\u4e00-\u9fff]+', '', content)

def apply_branding(content):
    # Brand Names
    content = content.replace("NUDOT CREATIVE STUDIO", "MILLIONAIRE DIZITAL LLP")
    content = content.replace("Nudot Studio", "MDZ")
    content = content.replace("NUDOT STUDIO", "MDZ")
    content = content.replace("NUDOT Studio", "MDZ")
    content = content.replace("Nudot", "MDZ")
    
    # Generic NUDOT replacement (covers variables like NUDOT_SITE_CONFIG -> MDZ_SITE_CONFIG)
    content = content.replace("NUDOT", "MDZ")
    content = content.replace("nudot", "mdz")
    
    return content

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return # Skip non-utf8 files like images if they sneak in

    original_content = content
    
    # 1. Fix URLs
    content = fix_media_urls(content)
    
    # 2. Apply Branding
    content = apply_branding(content)
    
    # 3. Strip Chinese Text
    content = remove_chinese(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

if __name__ == "__main__":
    print("Fixing local files...")
    for root, dirs, files in os.walk(TARGET_DIR):
        if "archive" in root or ".git" in root:
            continue
            
        for file in files:
            if file.endswith('.html') or file.endswith('.js') or file.endswith('.css'):
                process_file(os.path.join(root, file))
    
    print("All local files processed successfully.")
