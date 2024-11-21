export class TrendAnalyzer {
    static analyzeSentimentTrends(comments) {
        const sortedComments = comments.sort((a, b) => 
            new Date(a.publishedAt) - new Date(b.publishedAt)
        );

        const trends = sortedComments.reduce((acc, comment) => {
            const date = new Date(comment.publishedAt).toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = { positive: 0, negative: 0, neutral: 0, total: 0 };
            }
            acc[date][comment.sentiment]++;
            acc[date].total++;
            return acc;
        }, {});

        const dates = Object.keys(trends).sort();
        const datasets = {
            positive: [],
            negative: [],
            neutral: []
        };

        dates.forEach(date => {
            const total = trends[date].total;
            datasets.positive.push((trends[date].positive / total) * 100);
            datasets.negative.push((trends[date].negative / total) * 100);
            datasets.neutral.push((trends[date].neutral / total) * 100);
        });

        return { dates, datasets };
    }

    static filterCommentsByTimeRange(comments, range) {
        const now = new Date();
        const ranges = {
            day: new Date(now - 24 * 60 * 60 * 1000),
            week: new Date(now - 7 * 24 * 60 * 60 * 1000),
            month: new Date(now - 30 * 24 * 60 * 60 * 1000),
            all: new Date(0)
        };

        return comments.filter(comment => 
            new Date(comment.publishedAt) > ranges[range]
        );
    }
}