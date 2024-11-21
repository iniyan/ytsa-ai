<?php
class AI_Analysis {
    private $api_key;
    
    public function __construct() {
        $this->api_key = get_option('hf_api_key'); // Get from WordPress options
    }

    public function generate_takeaway($text) {
        $api_endpoint = 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn';
        
        $response = wp_remote_post($api_endpoint, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode(array(
                'inputs' => $text,
                'parameters' => array(
                    'max_length' => 130,
                    'min_length' => 30
                )
            ))
        ));

        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }

        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return array(
            'summary' => $result[0]['summary_text'] ?? '',
            'status' => 'success'
        );
    }
} 