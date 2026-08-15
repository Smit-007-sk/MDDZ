import os

fname = "c:/MDDZ/millionaire-dizital-structured/work.html"

with open(fname, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Clean SEO Title & Metas
html = html.replace("<title>設計案例 Works｜核點設計 Nudot Studio - 企業官網改版與頂級數位轉型實績</title>", "<title>Selected Works Portfolio | MILLIOANER DIZITAL</title>")
html = html.replace('<meta name="description" content="瀏覽核點設計 MILLIOANER DIZITAL 的頂級作品集。我們專注於台中網頁設計、動態特效設計與品牌視覺升級，跨足精密機械、科技、餐飲與美妝等多元產業，為企業打造具備國際大器格局的沉浸式數位體驗。">', '<meta name="description" content="Explore Selected Works Portfolio of MILLIOANER DIZITAL. Content, AI, and performance systems for brands that want revenue, not reach.">')
html = html.replace('<meta name="keywords" content="網頁設計作品集, 網頁設計案例, 台中網頁設計, 動態特效設計, 品牌視覺升級, 高階網頁設計, 品牌設計案例, UIUX設計作品, 互動網站設計, 企業官網改版案例, NUDOT, 核點設計">', '<meta name="keywords" content="Selected Works Portfolio, MILLIOANER DIZITAL, Web Design, AI workflows, Branding, Content Engine, Growth Engine">')
html = html.replace('設計案例 Works｜MILLIOANER DIZITAL - 網頁設計 × 動態特效 × 品牌視覺升級', 'Selected Works Portfolio | MILLIOANER DIZITAL')
html = html.replace('瀏覽核點設計 MILLIOANER DIZITAL 的頂級作品集。專注於台中網頁設計、動態特效設計與品牌視覺升級，為企業打造具備國際大器格局的沉浸式數位體驗。', 'Explore Selected Works Portfolio of MILLIOANER DIZITAL. Content, AI, and performance systems for brands.')
html = html.replace('MILLIOANER DIZITAL｜ ×  × ', 'MILLIOANER DIZITAL | Selected Works')
html = html.replace('——MILLIOANER DIZITAL。、，。', 'MILLIOANER DIZITAL | Selected Works Portfolio.')

# 2. Clean Navigation CJK terms
html = html.replace('alt="MILLIOANER DIZITAL 核點創意"', 'alt="MILLIOANER DIZITAL"')
html = html.replace('aria-label="首頁"', 'aria-label="Home"')
html = html.replace('aria-label="核點創意"', 'aria-label="About"')
html = html.replace('aria-label="設計案例"', 'aria-label="Work"')
html = html.replace('aria-label="核點實驗室"', 'aria-label="MDZ Makes AI"')
html = html.replace('aria-label="聯繫我們"', 'aria-label="Contact"')
html = html.replace('data-text="( 首頁 )"', 'data-text="( HOME )"')
html = html.replace('data-text="( 核點創意 )"', 'data-text="( ABOUT )"')
html = html.replace('data-text="( 設計案例 )"', 'data-text="( WORK )"')
html = html.replace('data-text="( 核點實驗室 )"', 'data-text="( MDZ MAKES AI )"')
html = html.replace('data-text="( 聯繫我們 )"', 'data-text="( CONTACT )"')
html = html.replace('data-text="首頁"', 'data-text="HOME"')
html = html.replace('data-text="核點創意"', 'data-text="ABOUT"')
html = html.replace('data-text="設計案例"', 'data-text="WORK"')
html = html.replace('data-text="核點實驗室"', 'data-text="MDZ MAKES AI"')
html = html.replace('data-text="聯繫我們"', 'data-text="CONTACT"')

# 3. Clean Threads / Facebook links (pointing to MILLIOANER DIZITAL profiles)
html = html.replace('https://www.threads.com/@leeyiheng0513', 'https://www.threads.net/')
html = html.replace('https://www.facebook.com/profile.php?id=61588727983387&locale=zh_TW', 'https://www.facebook.com/')

# 4. Clean Footer CJK lists
html = html.replace('<li><a href="work.html">品牌設計 / 網頁視覺</a></li>', '<li><a href="work.html">Brand Design & Visual Strategy</a></li>')
html = html.replace('<li><a href="work.html">動態特效 / 3D互動</a></li>', '<li><a href="work.html">3D Interactive Systems</a></li>')
html = html.replace('<li><a href="work.html">企業官網 / 數位轉型</a></li>', '<li><a href="work.html">Enterprise Web Apps & Systems</a></li>')
html = html.replace('<li><a href="work.html">系統架構 / 程式開發</a></li>', '<li><a href="work.html">AI Automation & Custom Dev</a></li>')

with open(fname, 'w', encoding='utf-8') as f:
    f.write(html)

print("work.html metadata and content cleaned successfully!")
