import os
import re
import urllib.request
import json

BASE_URL = "https://nudot.com.tw/"
TARGET_DIR = "c:/nud/nud/nudot.com.tw"

def fetch_file(path):
    url = BASE_URL + path
    print(f"Fetching {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def write_file(path, content):
    full_path = os.path.join(TARGET_DIR, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Saved {full_path}")

def fix_media_urls(content):
    # Regex to find src, data-src, data-thumb, etc. that start with images/ or css/ or js/
    # We want to prepend BASE_URL to them
    def replacer(match):
        attr = match.group(1)
        path = match.group(2)
        if path.startswith("images/") or path.startswith("css/") or path.startswith("js/") or path.startswith("videos/") or path.startswith("section-2/"):
            return f'{attr}="{BASE_URL}{path}"'
        return match.group(0)
    
    # Matches src="images/...", data-src="images/...", etc.
    content = re.sub(r'(src|data-src|data-image|data-mobile-image|data-thumb|data-mobile-thumb|data-defer-src|data-bg|href)="([^"]+)"', replacer, content)
    return content

def remove_chinese(content):
    # This removes all Chinese characters (CJK Unified Ideographs)
    return re.sub(r'[\u4e00-\u9fff]+', '', content)

def process_index():
    html = fetch_file("index.html")
    if not html: return
    
    # 1. Fix URLs
    html = fix_media_urls(html)
    
    # 2. SEO & Meta
    html = re.sub(r'<title>.*?</title>', '<title>MDZ | Content, AI & Performance Marketing Studio</title>', html)
    html = re.sub(r'<meta property="og:title" content=".*?">', '<meta property="og:title" content="MDZ | Content, AI & Performance Marketing Studio">', html)
    html = re.sub(r'<meta name="description"\s+content=".*?">', '<meta name="description" content="MILLIONAIRE DIZITAL LLP | Content, AI and performance systems for brands that want revenue, not reach.">', html, flags=re.DOTALL)
    html = re.sub(r'<meta property="og:description" content=".*?">', '<meta property="og:description" content="MILLIONAIRE DIZITAL LLP | Content, AI and performance systems for brands that want revenue, not reach.">', html)
    html = html.replace('核點 Nudot Studio｜台中網頁設計 × 品牌視覺升級 × 動態特效', 'MDZ | Content, AI & Performance Marketing Studio')
    html = html.replace('核點設計 NUDOT', 'MILLIONAIRE DIZITAL LLP')
    
    # 3. Page Transition
    html = html.replace('<div class="page-transition-meta is-top-left">( 首頁 )</div>', '<div class="page-transition-meta is-top-left">MDZ</div>')
    html = html.replace('<div class="page-transition-eyebrow js-page-transition-eyebrow">NUDOT CREATIVE STUDIO</div>', '<div class="page-transition-eyebrow js-page-transition-eyebrow">MILLIONAIRE DIZITAL LLP</div>')
    html = html.replace('<div class="page-transition-meta is-bottom-left">Brand visual × Motion × Code</div>', '<div class="page-transition-meta is-bottom-left">Content · AI · Performance</div>')

    # 4. Nav
    html = re.sub(r'<span class="ns-showcase-row__index" data-text="\( 首頁 \)"></span>', '<span class="ns-showcase-row__index" data-text="( HOME )"></span>', html)
    html = re.sub(r'<span class="ns-showcase-row__title-layer is-primary" data-text="首頁"></span>', '<span class="ns-showcase-row__title-layer is-primary" data-text="HOME"></span>', html)
    html = re.sub(r'<span class="ns-showcase-row__title-layer is-accent".*?data-text="首頁"></span>', '<span class="ns-showcase-row__title-layer is-accent" aria-hidden="true" data-text="HOME"></span>', html)
    
    # 5. Hero UI
    html = html.replace('<div class="small-tag">( Brand Direction )</div>', '<div class="small-tag">( Content · AI · Performance )</div>')
    html = html.replace('<li>核心策略規劃</li>', '<li>Content Engine</li>')
    html = html.replace('<li>品牌識別</li>', '<li>Growth Engine</li>')
    html = html.replace('<li>內容創意</li>', '<li>AI Engine</li>')
    html = html.replace('<li>技術趨勢實踐</li>', '<li>Brand Engine</li>')
    
    html = html.replace('<li>Creative Strategy</li>', '<li>Content</li>')
    html = html.replace('<li>Brand Identity</li>', '<li>AI</li>')
    html = html.replace('<li>Creative Content</li>', '<li>Performance</li>')
    html = html.replace('<li>Web Design</li>', '<li>Events</li>')
    
    html = re.sub(r'<h1 class="hero-title">高階網頁設計</h1>', '<h1 class="hero-title" style="font-size: 2.5vw; text-transform: none; line-height: 1.2;">We don\'t do marketing. We build demand.</h1><div style="font-size: 1vw; margin-top: 1vh;">Content, AI and performance systems for brands that want revenue, not reach.</div>', html)
    
    # Hero Quick Links
    html = html.replace('<a href="about" data-transition-label="About">About</a>', '<a href="work" data-transition-label="Work">Work</a>')
    html = html.replace('<a href="work" data-transition-label="Work">Work</a>', '<a href="services" data-transition-label="Services">Services</a>', 1)
    html = html.replace('<a href="lab" data-transition-label="Labs">Labs</a>', '<a href="mdz-makes-ai" data-transition-label="MDZ Makes AI">MDZ Makes AI</a>')
    html = html.replace('<a href="blog" data-transition-label="Blog">Blog</a>', '<a href="about" data-transition-label="About">About</a>\n                      <a href="insights" data-transition-label="Insights">Insights</a>')

    # Footer Top
    html = html.replace('Strategy, Design, and<br>\n                    Development. Lightning-fast, lean,<br>\n                    and sensibly priced.', 'Content, AI and performance systems<br>\n                    for brands that want revenue,<br>\n                    not reach.')
    html = html.replace('<a href="/cdn-cgi/l/email-protection" class="__cf_email__"\n                      data-cfemail="a5cdc0c9c9cae5cbd0c1cad18bc6cac88bd1d2">[email&#160;protected]</a><br>\n                    04-36033622<br>\n                    核點 Nudot Studio 2026©', '<a href="mailto:vikram@millionairedizital.com">vikram@millionairedizital.com</a><br>\n                    +91 8858585345<br>\n                    MILLIONAIRE DIZITAL LLP 2026©')
    
    # 6. Marquee
    marquee_orig = """<span class="marquee-block">
                            <span class="huge-title marquee-item">WEBDESIGN</span>
                            <span class="marquee-label">（ 網頁設計 ）</span>
                          </span>
                          <span class="marquee-block">
                            <span class="huge-title marquee-item">UI/UX</span>
                            <span class="marquee-label">（ 介面/體驗 ）</span>
                          </span>
                          <span class="marquee-block">
                            <span class="huge-title marquee-item">MOTION</span>
                            <span class="marquee-label">（ 動態設計 ）</span>
                          </span>
                          <span class="marquee-block">
                            <span class="huge-title marquee-item">BRANDING</span>
                            <span class="marquee-label">（ 品牌識別 ）</span>
                          </span>"""
    
    marquee_new = """<span class="marquee-block"><span class="huge-title marquee-item">CINEMATIC SHOOTS</span><span class="marquee-label">◆ સિનેમેટિક શૂટ ◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">SOCIAL MEDIA</span><span class="marquee-label">◆ સોશિયલ મીડિયા ◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">AI AUTOMATION</span><span class="marquee-label">◆ AI ઓટોમેશન ◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">PERFORMANCE MARKETING</span><span class="marquee-label">◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">WEBSITES</span><span class="marquee-label">◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">BRAND KITS</span><span class="marquee-label">◆ બ્રાન્ડ કિટ ◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">2D / 3D</span><span class="marquee-label">◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">VIDEO EDITING</span><span class="marquee-label">◆</span></span>
                          <span class="marquee-block"><span class="huge-title marquee-item">CLIPPING</span><span class="marquee-label">◆</span></span>"""
    
    html = html.replace(marquee_orig, marquee_new)
    
    # 7. STM (4 engines)
    stm_orig = """<div class="stm-group">
              <div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">Brand identity</div>
              <div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">Visual strategy</div>
              <div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">核點創意</div>
            </div>"""
    stm_new = """<div class="stm-group"><div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">WHO WE ARE</div><div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">Rajkot-built.</div><div class="stm-el stm-pos-4" data-stm-alt="stm-pos-2">Globally deployed.</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3">Three friends</div><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3">₹599 a piece</div><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3">Rajkot businesses</div><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3">world-class on a budget</div></div>
            <div class="stm-group"><div class="stm-el stm-el--xl stm-pos-1" data-stm-alt="stm-pos-2" data-stm-scramble="2.5">M</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3" data-stm-scramble="0">Now a full studio</div><div class="stm-el stm-pos-1 stm-typing" data-stm-alt="stm-pos-3" data-stm-scramble="0">█</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">CONTENT ENGINE</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">Cinematic shoots</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">BTS/UGC</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">Product shoots</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">Editing</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-5">Clipping</div></div>
            <div class="stm-group"><div class="stm-el stm-el--xl stm-pos-3" data-stm-alt="stm-pos-9" data-stm-scramble="2.5">D</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-3" data-stm-alt="stm-pos-2">GROWTH ENGINE</div><div class="stm-el stm-pos-3" data-stm-alt="stm-pos-2">Social media management</div><div class="stm-el stm-pos-3" data-stm-alt="stm-pos-2">Meta ads</div><div class="stm-el stm-pos-3" data-stm-alt="stm-pos-2">SEO/AEO</div><div class="stm-el stm-pos-3" data-stm-alt="stm-pos-2">Influencer coordination</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-3" data-stm-scramble="0">AI ENGINE</div><div class="stm-el stm-pos-1 stm-typing" data-stm-alt="stm-pos-3" data-stm-scramble="0">█</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-4">AI automation</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-4">AI content</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-4">Chatbots</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-4">AI CRM</div></div>
            <div class="stm-group"><div class="stm-el stm-el--xl stm-pos-1" data-stm-alt="stm-pos-3" data-stm-scramble="2.5">Z</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-9">BRAND ENGINE</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-9">Graphic design</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-9">Brand kits</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-9">Websites</div><div class="stm-el stm-pos-2" data-stm-alt="stm-pos-9">2D/3D animation</div></div>
            <div class="stm-group"><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-1">Does it make</div><div class="stm-el stm-pos-1" data-stm-alt="stm-pos-2">the client money?</div></div>"""
    
    # Simple regex to replace the entire stm-content div contents
    html = re.sub(r'<div class="stm-content">.*?</div>\s*</section>', f'<div class="stm-content">\n{stm_new}\n</div>\n</section>', html, flags=re.DOTALL)
    
    # 8. Core capabilities
    html = html.replace('14Y_VISUAL_MASTERY', '12Y_DIGITAL_EXPERIENCE')
    html = html.replace('400+_DEPLOYED_WORKS', '400+_BRANDS_SERVED')
    html = html.replace('ESTABLISHED_2026', '300M+_VIEWS_GENERATED')
    html = html.replace('<h2 class="reveal-inner" style="margin: 0;">跨領域視覺與數位整合</h2>', '<h2 class="reveal-inner" style="margin: 0;">We build demand</h2>')
    
    html = html.replace('( 網頁視覺美學 )', '( Performance Ads )')
    html = html.replace('( 高階商業視覺 )', '( SEO & Local SEO )')
    html = html.replace('( 使用體驗與介面 )', '( Video Production )')
    html = html.replace('( AI 圖像 · 影像 )', '( Web & 3D )')
    
    html = html.replace('( 重新定義品牌的視覺思維 )', '( The MDZ Aesthetic )')
    html = html.replace('BY NUDOT', 'BY MDZ')
    html = html.replace('數位視覺能量釋放點', 'Our Digital DNA')
    
    # 9. Main Footer
    html = html.replace('Web Design Studio', 'Growth · Content · AI')
    html = html.replace('Commercial Visual · AI Motion', 'Commercial Visuals')
    html = html.replace('Est. 2026 · Taichung', 'Rajkot, Gujarat')
    
    html = re.sub(r'<p class="footer-description">.*?</p>', '<p class="footer-description">MILLIONAIRE DIZITAL LLP | Content, AI and performance systems for brands that want revenue, not reach. We don\'t do marketing. We build demand.</p>', html, flags=re.DOTALL)
    html = re.sub(r'<div class="footer-contact-info">.*?</div>', '<div class="footer-contact-info"><a href="mailto:vikram@millionairedizital.com">vikram@millionairedizital.com</a><span>+91 88585 85345</span></div>', html, flags=re.DOTALL)
    html = html.replace('臺中市北屯區文心路三段447號｜0983-750-522', 'Amin Marg, Rajkot, Gujarat')
    
    html = html.replace('核點創意有限公司', 'MILLIONAIRE DIZITAL LLP')
    html = html.replace('&#169; 2026 NUDOT STUDIO. ALL RIGHTS RESERVED.', '&#169; 2026 MILLIONAIRE DIZITAL LLP. ALL RIGHTS RESERVED.')
    
    # Final strip of Chinese from HTML to prevent any remaining bits
    html = remove_chinese(html)
    
    write_file("index.html", html)

def process_site_config():
    js = fetch_file("js/site-config.js")
    if not js: return
    
    # Fix paths
    js = fix_media_urls(js)
    
    # Overwrite the json structure specifically
    js = js.replace('"Brand Direction"', '"Content · AI · Performance"')
    js = js.replace('brandName: "NUDOT. STUDIO",', 'brandName: "MILLIONAIRE DIZITAL LLP",')
    js = js.replace('tagline: "High-end visual & web experience",', 'tagline: "Rajkot-built. Globally deployed.",')
    js = js.replace('location: "Taichung, Taiwan",', 'location: "Rajkot, Gujarat",')
    js = js.replace('email: "hi@nudot.com.tw",', 'email: "vikram@millionairedizital.com",')
    js = js.replace('phone: "04-36033622",', 'phone: "+91 8858585345",')
    
    js = remove_chinese(js)
    write_file("js/site-config.js", js)

def process_main_script():
    js = fetch_file("js/main-script.js")
    if not js: return
    
    # Fix paths
    js = fix_media_urls(js)
    
    # Strip chinese characters which were injected dynamically
    js = remove_chinese(js)
    write_file("js/main-script.js", js)

def process_other_js():
    for f in ["js/main.js", "js/lazy-media.js", "js/animations/loader.js", "js/animations/core-capabilities.js", "js/animations/section-transitions.js", "section-2/section-2.js", "noise.js"]:
        js = fetch_file(f)
        if js:
            js = fix_media_urls(js)
            js = remove_chinese(js)
            write_file(f, js)

if __name__ == "__main__":
    print("Restoring and branding files...")
    process_index()
    process_site_config()
    process_main_script()
    process_other_js()
    print("Done! Check your local server.")
