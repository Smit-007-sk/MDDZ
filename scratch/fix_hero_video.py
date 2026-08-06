# Fix the hero prewarm video URLs to load from the remote server
with open('c:/MDDZ/index.html', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Replace local paths in the prewarm script
old_desktop = "images/home/slider1/slider01.mp4"
new_desktop = "https://nudot.com.tw/images/home/slider1/slider01.mp4"

old_mobile = "images/home/slider1/slider01_s.mp4"
new_mobile = "https://nudot.com.tw/images/home/slider1/slider01_s.mp4"

new_content = content.replace(old_desktop, new_desktop)
new_content = new_content.replace(old_mobile, new_mobile)

if new_content != content:
    with open('c:/MDDZ/index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully fixed hero section video URLs to load online!")
else:
    print("No matches found to replace. Check if URLs were already absolute.")
