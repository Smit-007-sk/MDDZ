const fs = require('fs');

const html = fs.readFileSync('c:/nud/nudot.com.tw/index.html', 'utf8');

function getBlock(html, startTag, openTag, closeTag) {
    const start = html.indexOf(startTag);
    if (start === -1) {
        console.error('Could not find:', startTag);
        return null;
    }
    let end = start;
    let openCount = 0;
    for(let i = start; i < html.length; i++) {
        if (html.substring(i, i + openTag.length) === openTag) openCount++;
        else if (html.substring(i, i + closeTag.length) === closeTag) {
            openCount--;
            if (openCount === 0) {
                end = i + closeTag.length + 1;
                break;
            }
        }
    }
    return { start, end, content: html.substring(start, end) };
}

const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>') + 7;
const headContent = html.substring(headStart, headEnd);

// Instead of body block, let's just use the whole html to find pieces
const darkWrapperBlock = getBlock(html, '<div class="dark-wrapper-mask"', '<div', '</div');
const stmLogoBlock = getBlock(html, '<div class="stm-logo"', '<div', '</div');
const stmSecBlock = getBlock(html, '<section class="stm-section"', '<section', '</section');

const bodyContentStart = html.indexOf('<body');
const bodyContentEnd = html.indexOf('</body>');
const bodyContent = html.substring(bodyContentStart, bodyContentEnd);

// Collect scripts
const scriptMatches = bodyContent.matchAll(/<script[\s\S]*?<\/script>/gi);
let scriptsHtml = '';
for (const match of scriptMatches) {
    scriptsHtml += match[0] + '\n';
}

// Collect svgs
const svgMatches = bodyContent.matchAll(/<svg[\s\S]*?<\/svg>/gi);
let svgsHtml = '';
for (const match of svgMatches) {
    svgsHtml += match[0] + '\n';
}

const emptyHero = '<div class="hero-section" style="display:none;"><div id="webgl-container"></div></div>';

const newHtml = `<!DOCTYPE html>
<html lang="zh-TW">
${headContent}
<body>
  ${svgsHtml}
  
  <div class="scroll-track">
    <div class="sticky-container">
      ${emptyHero}
      ${darkWrapperBlock ? darkWrapperBlock.content : '<!-- DARK WRAPPER NOT FOUND -->'}
    </div>
    
    ${stmLogoBlock ? stmLogoBlock.content : '<!-- STM LOGO NOT FOUND -->'}
    ${stmSecBlock ? stmSecBlock.content : '<!-- STM SEC NOT FOUND -->'}
  </div>
  
  ${scriptsHtml}
</body>
</html>`;

fs.writeFileSync('c:/nud/nudot.com.tw/2nd_section.html', newHtml);
console.log('Successfully generated 2nd_section.html');
