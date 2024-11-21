jQuery(document).ready(function($) {
    $('#generate-takeaway').on('click', function() {
        const analysisText = $('#analysis-content').val();
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'generate_takeaway',
                nonce: ai_analysis.nonce,
                text: analysisText
            },
            success: function(response) {
                if (response.success) {
                    $('#takeaway-result').html(response.data.summary);
                } else {
                    alert('Error generating takeaway');
                }
            }
        });
    });
}); 