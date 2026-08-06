import os

for root, dirs, files in os.walk('c:/MDDZ/images'):
    for file in files:
        if file.endswith(('.svg', '.png', '.jpg', '.webp')):
            # Print relative path
            print(os.path.relpath(os.path.join(root, file), 'c:/MDDZ'))
