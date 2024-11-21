<?php
/*
Plugin Name: YouTube Multilingual Sentiment Analyzer
Plugin URI: https://iniyan.in/youtube-sentiment-analyzer
Description: Analyze YouTube video comments for sentiment in multiple languages using XLM-RoBERTa
Version: 1.1
Author: Iniyan
Author URI: https://iniyan.in
*/

class YouTube_Sentiment_Analyzer {
    private $youtube_api_key;
    private $huggingface_api_key;
    private $db_version = '1.1';

    public function __construct() {
        add_action('init', [$this, 'init_plugin']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_shortcode('youtube_sentiment', [$this, 'render_sentiment_analyzer']);
        register_activation_hook(__FILE__, [$this, 'install_database']);
        add_action('wp_ajax_analyze_youtube_comments', [$this, 'analyze_youtube_comments']);
        add_action('wp_ajax_nopriv_analyze_youtube_comments', [$this, 'analyze_youtube_comments']);
        add_action('wp_ajax_generate_takeaway', 'handle_generate_takeaway');
    }

    public function init_plugin() {
        add_action('admin_menu', [$this, 'add_settings_page']);
        add_action('admin_init', [$this, 'register_settings']);
    }

    public function add_settings_page() {
        add_options_page(
            'YouTube Sentiment Analyzer', 
            'YT Sentiment', 
            'manage_options', 
            'youtube-sentiment-settings', 
            [$this, 'render_settings_page']
        );
    }

    public function register_settings() {
        register_setting('youtube_sentiment_options', 'youtube_api_key');
        register_setting('youtube_sentiment_options', 'huggingface_api_key');
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>YouTube Sentiment Analyzer Settings</h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('youtube_sentiment_options');
                do_settings_sections('youtube_sentiment_options');
                ?>
                <table class="form-table">
                    <tr>
                        <th>YouTube API Key</th>
                        <td>
                            <input 
                                type="text" 
                                name="youtube_api_key" 
                                value="<?php echo esc_attr(get_option('youtube_api_key')); ?>" 
                                class="regular-text"
                            >
                        </td>
                    </tr>
                    <tr>
                        <th>Hugging Face API Key</th>
                        <td>
                            <input 
                                type="text" 
                                name="huggingface_api_key" 
                                value="<?php echo esc_attr(get_option('huggingface_api_key')); ?>" 
                                class="regular-text"
                            >
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    public function install_database() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'youtube_sentiment_analyses';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            video_id VARCHAR(20) NOT NULL,
            comment_text TEXT NOT NULL,
            sentiment VARCHAR(20) NOT NULL,
            confidence FLOAT NOT NULL,
            language VARCHAR(10),
            analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        add_option('youtube_sentiment_db_version', $this->db_version);
    }

    public function enqueue_scripts() {
        wp_enqueue_script(
            'chart-js', 
            'https://cdn.jsdelivr.net/npm/chart.js', 
            [], 
            '3.7.1', 
            true
        );
        
        wp_enqueue_script(
            'chartjs-adapter-date-fns',
            'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js',
            ['chart-js'],
            '1.0',
            true
        );

        wp_enqueue_script(
            'youtube-sentiment-script', 
            plugin_dir_url(__FILE__) . 'js/sentiment-analyzer.js', 
            ['jquery', 'chart-js'], 
            '1.0', 
            true
        );
        
        wp_enqueue_style(
            'youtube-sentiment-style', 
            plugin_dir_url(__FILE__) . 'css/sentiment-analyzer.css'
        );

        wp_localize_script('youtube-sentiment-script', 'youtube_sentiment_params', [
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('youtube_sentiment_nonce')
        ]);

        // Enqueue the AI analysis script
        wp_enqueue_script(
            'ai-analysis-js',
            plugin_dir_url( dirname( __FILE__ ) ) . 'js/ai-analysis.js',
            array('jquery'),
            filemtime(plugin_dir_path( dirname( __FILE__ ) ) . 'js/ai-analysis.js'),
            true
        );

        // Localize script with nonce and any other data needed
        wp_localize_script(
            'ai-analysis-js',
            'ai_analysis',
            array(
                'nonce' => wp_create_nonce('ai_analysis_nonce'),
                'ajaxurl' => admin_url('admin-ajax.php')
            )
        );
    }

    private function analyze_sentiment_huggingface($text) {
        $api_key = get_option('huggingface_api_key');
        $url = 'https://api-inference.huggingface.co/models/xlm-roberta-base-sentiment';
        
        $response = wp_remote_post($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode(['inputs' => $text]),
            'timeout' => 30
        ]);

        if (is_wp_error($response)) {
            error_log('HuggingFace API Error: ' . $response->get_error_message());
            return ['sentiment' => 'neutral', 'confidence' => 0];
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!empty($body[0])) {
            $max_score = 0;
            $sentiment = 'neutral';
            $confidence = 0;
            
            foreach ($body[0] as $result) {
                if ($result['score'] > $max_score) {
                    $max_score = $result['score'];
                    $confidence = $result['score'];
                    $label = strtolower($result['label']);
                    
                    switch ($label) {
                        case '5 stars':
                        case '4 stars':
                        case 'positive':
                            $sentiment = 'positive';
                            break;
                        case '1 star':
                        case '2 stars':
                        case 'negative':
                            $sentiment = 'negative';
                            break;
                        default:
                            $sentiment = 'neutral';
                    }
                }
            }
            return ['sentiment' => $sentiment, 'confidence' => $confidence];
        }
        
        return ['sentiment' => 'neutral', 'confidence' => 0];
    }

    public function analyze_youtube_comments() {
        check_ajax_referer('youtube_sentiment_nonce', 'security');
        
        $video_url = sanitize_text_field($_POST['video_url']);
        if (empty($video_url)) {
            wp_send_json_error('Invalid video URL');
        }

        preg_match('/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/', $video_url, $matches);
        
        if (!isset($matches[1])) {
            wp_send_json_error('Could not extract video ID');
        }

        $video_id = $matches[1];
        $api_key = get_option('youtube_api_key');
        $all_comments = [];
        $next_page_token = null;
        $max_pages = 10;
        $current_page = 0;

        do {
            $api_url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId={$video_id}&key={$api_key}&maxResults=100&order=relevance";
            
            if ($next_page_token) {
                $api_url .= "&pageToken=" . $next_page_token;
            }

            $response = wp_remote_get($api_url);
            if (is_wp_error($response)) {
                wp_send_json_error('Error fetching comments: ' . $response->get_error_message());
            }

            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (!empty($data['items'])) {
                foreach ($data['items'] as $item) {
                    $comment = $item['snippet']['topLevelComment']['snippet'];
                    $sentiment_result = $this->analyze_sentiment_huggingface($comment['textDisplay']);
                    
                    $all_comments[] = [
                        'text' => $comment['textDisplay'],
                        'likes' => $comment['likeCount'],
                        'publishedAt' => $comment['publishedAt'],
                        'sentiment' => $sentiment_result['sentiment'],
                        'confidence' => $sentiment_result['confidence']
                    ];

                    // Store in database
                    global $wpdb;
                    $wpdb->insert(
                        $wpdb->prefix . 'youtube_sentiment_analyses',
                        [
                            'video_id' => $video_id,
                            'comment_text' => $comment['textDisplay'],
                            'sentiment' => $sentiment_result['sentiment'],
                            'confidence' => $sentiment_result['confidence'],
                            'analyzed_at' => current_time('mysql')
                        ]
                    );
                }
            }

            $next_page_token = isset($data['nextPageToken']) ? $data['nextPageToken'] : null;
            $current_page++;

        } while ($next_page_token && $current_page < $max_pages);

        // Process sentiment statistics
        $positive_comments = array_filter($all_comments, fn($c) => $c['sentiment'] === 'positive');
        $negative_comments = array_filter($all_comments, fn($c) => $c['sentiment'] === 'negative');
        $neutral_comments = array_filter($all_comments, fn($c) => $c['sentiment'] === 'neutral');

        // Sort by likes and confidence
        $sort_by_engagement = function($a, $b) {
            $a_score = $a['likes'] * $a['confidence'];
            $b_score = $b['likes'] * $b['confidence'];
            return $b_score - $a_score;
        };

        usort($positive_comments, $sort_by_engagement);
        usort($negative_comments, $sort_by_engagement);
        usort($neutral_comments, $sort_by_engagement);

        $sentiment_results = [
            'total_comments' => count($all_comments),
            'positive_comments' => count($positive_comments),
            'negative_comments' => count($negative_comments),
            'neutral_comments' => count($neutral_comments),
            'top_positive' => array_slice($positive_comments, 0, 5),
            'top_negative' => array_slice($negative_comments, 0, 5),
            'top_neutral' => array_slice($neutral_comments, 0, 5),
            'comments' => $all_comments
        ];

        wp_send_json_success($sentiment_results);
    }

    public function render_sentiment_analyzer() {
        ob_start();
        ?>
        <div class="youtube-sentiment-analyzer">
            <form id="youtube-sentiment-form">
                <input 
                    type="text" 
                    id="youtube-video-url" 
                    placeholder="Enter YouTube Video URL" 
                    required
                >
                <button type="submit">Analyze Comments</button>
            </form>

            <div id="sentiment-results" style="display:none;">
                <h3>Sentiment Analysis</h3>
                <div class="sentiment-summary">
                    <div class="summary-box positive">
                        <h3>Positive Comments</h3>
                        <div class="count" id="positive-comments">0</div>
                    </div>
                    <div class="summary-box negative">
                        <h3>Negative Comments</h3>
                        <div class="count" id="negative-comments">0</div>
                    </div>
                    <div class="summary-box neutral">
                        <h3>Neutral Comments</h3>
                        <div class="count" id="neutral-comments">0</div>
                    </div>
                    <div class="summary-box total">
                        <h3>Total Comments</h3>
                        <div class="count" id="total-comments">0</div>
                    </div>
                </div>
                <div id="chart-container">
                    <canvas id="sentiment-chart"></canvas>
                </div>
                <div class="sentiment-trends" style="display: none;">
                    <h3>Sentiment Trends Over Time</h3>
                    <div class="trends-controls">
                        <select id="time-range">
                            <option value="all">All Time</option>
                            <option value="month">Last Month</option>
                            <option value="week">Last Week</option>
                            <option value="day">Last 24 Hours</option>
                        </select>
                    </div>
                    <div class="trends-chart-container">
                        <canvas id="trends-chart"></canvas>
                    </div>
                </div>
                <div class="comment-highlights">
                    <div class="highlights-section">
                        <h3>Comment Highlights</h3>
                        <div class="highlight-columns">
                            <div class="highlight-box positive">
                                <h4>Positive Highlights</h4>
                                <div id="positive-highlights" class="highlight-content"></div>
                            </div>
                            <div class="highlight-box negative">
                                <h4>Negative Highlights</h4>
                                <div id="negative-highlights" class="highlight-content"></div>
                            </div>
                        </div>
                    </div>

                    <div class="comments-tabs">
                        <h3>Most Engaging Comments</h3>
                        <div class="tab-navigation">
                            <button class="tab-button active" data-tab="positive">Positive Comments</button>
                            <button class="tab-button" data-tab="negative">Negative Comments</button>
                            <button class="tab-button" data-tab="neutral">Neutral Comments</button>
                        </div>

                        <div class="tab-content active" id="positive-tab">
                            <div id="top-positive-comments"></div>
                        </div>
                        <div class="tab-content" id="negative-tab">
                            <div id="top-negative-comments"></div>
                        </div>
                        <div class="tab-content" id="neutral-tab">
                            <div id="top-neutral-comments"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="analysis-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <p>Analyzing comments... This may take a few moments.</p>
            </div>
            <div class="keyword-analysis" style="display: none;">
                <h3>Top Keywords</h3>
                <div class="keyword-grid" id="keyword-cloud"></div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
}

function handle_generate_takeaway() {
    check_ajax_referer('ai_analysis_nonce', 'nonce');
    
    if (!current_user_can('edit_posts')) {
        wp_send_json_error('Insufficient permissions');
    }

    $text = sanitize_textarea_field($_POST['text']);
    $ai_analysis = new AI_Analysis();
    $result = $ai_analysis->generate_takeaway($text);
    
    wp_send_json_success($result);
}

// Initialize the plugin
new YouTube_Sentiment_Analyzer();