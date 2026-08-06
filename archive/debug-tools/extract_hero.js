const fs = require('fs');

const html = fs.readFileSync('c:/nud/nudot.com.tw/index.html', 'utf8');

const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>') + 7;
const head = html.substring(headStart, headEnd);

const bodyStart = html.indexOf('<body');
const bodyEnd = html.indexOf('</body>');
const bodyContent = html.substring(bodyStart, bodyEnd);

const heroStart = bodyContent.indexOf('<div class="hero-section">');
let heroEnd = heroStart;
let openDivs = 0;
for(let i=heroStart; i<bodyContent.length; i++) {
    if (bodyContent.substring(i, i+4) === '<div') openDivs++;
    else if (bodyContent.substring(i, i+5) === '</div') {
        openDivs--;
        if(openDivs === 0) {
            heroEnd = i + 6;
            break;
        }
    }
}

const heroHtml = bodyContent.substring(heroStart, heroEnd);

const scriptMatches = bodyContent.matchAll(/<script[\s\S]*?<\/script>/gi);
let scriptsHtml = '';
for (const match of scriptMatches) {
    scriptsHtml += match[0] + '\n';
}

const svgMatches = bodyContent.matchAll(/<svg[\s\S]*?<\/svg>/gi);
let svgsHtml = '';
for (const match of svgMatches) {
    // some svgs might be inside the hero section, so don't duplicate them if so
    if (match.index < heroStart || match.index > heroEnd) {
        svgsHtml += match[0] + '\n';
    }
}


const newHtml = `<!DOCTYPE html>
<html lang="zh-TW">
${head}
<body>
  ${svgsHtml}
  <div class="scroll-track">
    <div class="sticky-container">
      ${heroHtml}
    </div>
  </div>
  ${scriptsHtml}
</body>
</html>`;

fs.writeFileSync('c:/nud/nudot.com.tw/1st_section.html', newHtml);
console.log('Successfully generated 1st_section.html');
