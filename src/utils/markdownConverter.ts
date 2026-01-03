export function markdownToHtml(markdown: string): string {
    if (!markdown) return '';

    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let listType = ''; // 'ul' or 'ol'

    lines.forEach((line) => {
        let processedLine = line.trim();

        if (processedLine === '') {
            if (inList) {
                html += `</${listType}>`;
                inList = false;
                listType = '';
            }
            return;
        }

        // Headers
        if (processedLine.startsWith('# ')) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h1>${processInline(processedLine.slice(2))}</h1>`;
            return;
        }
        if (processedLine.startsWith('## ')) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h2>${processInline(processedLine.slice(3))}</h2>`;
            return;
        }
        if (processedLine.startsWith('### ')) {
            if (inList) { html += `</${listType}>`; inList = false; }
            html += `<h3>${processInline(processedLine.slice(4))}</h3>`;
            return;
        }

        // List detection
        const isUl = /^[-*]\s/.test(processedLine);
        const isOl = /^\d+\.\s/.test(processedLine);

        if (isUl) {
            if (!inList || listType !== 'ul') {
                if (inList) html += `</${listType}>`;
                html += '<ul>';
                inList = true;
                listType = 'ul';
            }
            html += `<li>${processInline(processedLine.replace(/^[-*]\s/, ''))}</li>`;
        } else if (isOl) {
            if (!inList || listType !== 'ol') {
                if (inList) html += `</${listType}>`;
                html += '<ol>';
                inList = true;
                listType = 'ol';
            }
            html += `<li>${processInline(processedLine.replace(/^\d+\.\s/, ''))}</li>`;
        } else {
            if (inList) {
                html += `</${listType}>`;
                inList = false;
                listType = '';
            }
            html += `<p>${processInline(processedLine)}</p>`;
        }
    });

    if (inList) {
        html += `</${listType}>`;
    }

    return html;
}

function processInline(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}
