

export function updateLayout(showAdvanced) {
    if (!showAdvanced) {
        $('#acm_left_panel').removeClass('panel-hidden');
        $('#acm_right_panel').addClass('panel-hidden');
        $('#separator-label').text('Advanced Definitions');
    } else {
        $('#acm_right_panel').removeClass('panel-hidden');
        $('#acm_left_panel').addClass('panel-hidden');
        $('#separator-label').text('Main Definitions');
    }
}
