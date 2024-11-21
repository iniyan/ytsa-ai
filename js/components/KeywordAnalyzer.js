export class KeywordAnalyzer {
    static analyzeKeywords(comments) {
        const stopWords = new Set(['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what']);
        
        const keywords = {};
        comments.forEach(comment => {
            const words = comment.text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 3 && !stopWords.has(word));
                
            words.forEach(word => {
                keywords[word] = (keywords[word] || 0) + 1;
            });
        });
        
        return Object.entries(keywords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);
    }

    static displayKeywords(keywords) {
        const colors = [
            '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#F44336',
            '#009688', '#673AB7', '#FF5722', '#795548', '#607D8B'
        ];
        
        const maxCount = keywords[0][1];
        const minCount = keywords[keywords.length - 1][1];
        
        const keywordHtml = keywords.map(([word, count], index) => {
            const size = this.mapRange(count, minCount, maxCount, 14, 28);
            const colorIndex = index % colors.length;
            
            return `
                <div class="keyword-item" 
                     style="--size: ${size}px; --color: ${colors[colorIndex]}">
                    ${word}
                    <span class="keyword-count">${count}</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('keyword-cloud').innerHTML = keywordHtml;
    }

    static mapRange(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
}