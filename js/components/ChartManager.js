export class ChartManager {
    constructor() {
        this.sentimentChart = null;
        this.trendsChart = null;
    }

    destroyCharts() {
        if (this.sentimentChart) {
            this.sentimentChart.destroy();
            this.sentimentChart = null;
        }
        if (this.trendsChart) {
            this.trendsChart.destroy();
            this.trendsChart = null;
        }
    }

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
    }

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
}