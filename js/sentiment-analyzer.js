// Import components
const ChartManager = {
    sentimentChart: null,
    trendsChart: null,

    destroyCharts() {
        if (this.sentimentChart) {
            this.sentimentChart.destroy();
            this.sentimentChart = null;
        }
        if (this.trendsChart) {
            this.trendsChart.destroy();
            this.trendsChart = null;
        }
    },

    createSentimentChart(data) {
        const ctx = document.getElementById('sentiment-chart').getContext('2d');
        const total = data.total_comments;
        
        this.sentimentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Comments'],
                datasets: [{
                    data: [total],
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        
                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                        const posPercent = data.positive_comments / total;
                        const negPercent = data.negative_comments / total;
                        
                        gradient.addColorStop(0, '#4CAF50');
                        gradient.addColorStop(posPercent, '#4CAF50');
                        gradient.addColorStop(posPercent, '#FF6384');
                        gradient.addColorStop(posPercent + negPercent, '#FF6384');
                        gradient.addColorStop(posPercent + negPercent, '#36A2EB');
                        gradient.addColorStop(1, '#36A2EB');
                        
                        return gradient;
                    }
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        display: false,
                        beginAtZero: true,
                        grid: { display: false }
                    },
                    y: {
                        display: false,
                        grid: { display: false }
                    }
                }
            }
        });
    },

    createTrendsChart(trendsData) {
        const ctx = document.getElementById('trends-chart').getContext('2d');
        
        const formattedData = trendsData.dates.map((date, index) => ({
            x: new Date(date),
            y: trendsData.datasets.positive[index]
        }));

        const formattedNegative = trendsData.dates.map((date, index) => ({
            x: new Date(date),
            y: trendsData.datasets.negative[index]
        }));

        const formattedNeutral = trendsData.dates.map((date, index) => ({
            x: new Date(date),
            y: trendsData.datasets.neutral[index]
        }));

        this.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Positive',
                        data: formattedData,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Negative',
                        data: formattedNegative,
                        borderColor: '#F44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Neutral',
                        data: formattedNeutral,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sentiment Distribution Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: value => value + '%'
                        }
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MMM d'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }
};

const CommentManager = {
    formatComment(comment) {
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
    },

    updateCommentSections(data) {
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
};

const KeywordAnalyzer = {
    analyzeKeywords(comments) {
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
    },

    displayKeywords(keywords) {
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
    },

    mapRange(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
};

const TrendAnalyzer = {
    analyzeSentimentTrends(comments) {
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
    },

    filterCommentsByTimeRange(comments, range) {
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
};

// Main application class
class SentimentAnalyzer {
    constructor() {
        this.allComments = [];
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('youtube-sentiment-form').addEventListener('submit', this.handleFormSubmit.bind(this));
        document.getElementById('time-range').addEventListener('change', this.handleTimeRangeChange.bind(this));
        
        // Tab functionality
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', this.handleTabClick.bind(this));
        });
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const videoUrl = document.getElementById('youtube-video-url').value;
        ChartManager.destroyCharts();
        
        // Hide results sections
        document.getElementById('sentiment-results').style.display = 'none';
        document.querySelector('.keyword-analysis').style.display = 'none';
        document.querySelector('.sentiment-trends').style.display = 'none';
        document.getElementById('analysis-loading').style.display = 'block';
        
        this.analyzeSentiment(videoUrl);
    }

    async analyzeSentiment(videoUrl) {
        try {
            const response = await fetch(youtube_sentiment_params.ajaxurl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'analyze_youtube_comments',
                    video_url: videoUrl,
                    security: youtube_sentiment_params.nonce
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.updateUI(result.data);
            } else {
                console.error('Error:', result.data);
                alert(result.data);
            }
        } catch (error) {
            console.error('AJAX Error:', error);
            alert('An error occurred while analyzing comments');
        } finally {
            document.getElementById('analysis-loading').style.display = 'none';
        }
    }

    updateUI(data) {
        // Store comments globally
        this.allComments = data.comments;
        
        // Update comment sections
        CommentManager.updateCommentSections(data);
        
        // Create charts
        ChartManager.createSentimentChart(data);
        
        // Analyze and display keywords
        if (data.comments?.length > 0) {
            const keywords = KeywordAnalyzer.analyzeKeywords(data.comments);
            if (keywords.length > 0) {
                KeywordAnalyzer.displayKeywords(keywords);
                document.querySelector('.keyword-analysis').style.display = 'block';
            }
            
            // Display trends
            const trendsData = TrendAnalyzer.analyzeSentimentTrends(data.comments);
            ChartManager.createTrendsChart(trendsData);
            document.querySelector('.sentiment-trends').style.display = 'block';
        }
        
        // Show results
        document.getElementById('sentiment-results').style.display = 'block';
    }

    handleTimeRangeChange(e) {
        const range = e.target.value;
        const filteredComments = TrendAnalyzer.filterCommentsByTimeRange(this.allComments, range);
        const trendsData = TrendAnalyzer.analyzeSentimentTrends(filteredComments);
        ChartManager.createTrendsChart(trendsData);
    }

    handleTabClick(e) {
        const tabId = e.target.dataset.tab;
        
        // Update active states
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Show selected content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }
}

// Initialize the application when DOM is ready
jQuery(document).ready(() => {
    new SentimentAnalyzer();
});