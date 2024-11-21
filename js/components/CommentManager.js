export class CommentManager {
    static formatComment(comment) {
        if (!comment) return '';
        return `
            <div class="comment-item">
                <div class="comment-text">${comment.text}</div>
                <div class="engagement-stats">
                    <span class="likes">👍 ${comment.likes} likes</span>
                    <span class="date">• ${new Date(comment.publishedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }

    static updateCommentSections(data) {
        // Update statistics
        const total = data.total_comments;
        document.getElementById('total-comments').textContent = total;

        const sections = [
            { id: 'positive', count: data.positive_comments },
            { id: 'negative', count: data.negative_comments },
            { id: 'neutral', count: data.neutral_comments }
        ];

        sections.forEach(section => {
            const percent = ((section.count/total)*100).toFixed(1);
            document.getElementById(`${section.id}-comments`).innerHTML = 
                `${section.count} <span class="percentage">(${percent}%)</span>`;
        });

        // Update comment lists
        document.getElementById('top-positive-comments').innerHTML = 
            data.top_positive.map(this.formatComment).join('');
        document.getElementById('top-negative-comments').innerHTML = 
            data.top_negative.map(this.formatComment).join('');
        document.getElementById('top-neutral-comments').innerHTML = 
            data.top_neutral.map(this.formatComment).join('');

        // Update highlights
        const positiveHighlights = data.top_positive
            .slice(0, 3)
            .map(comment => `"${comment.text}"`)
            .join('<br><br>');
        
        const negativeHighlights = data.top_negative
            .slice(0, 3)
            .map(comment => `"${comment.text}"`)
            .join('<br><br>');

        document.getElementById('positive-highlights').innerHTML = positiveHighlights;
        document.getElementById('negative-highlights').innerHTML = negativeHighlights;
    }
}