<?php

/**
 * Plugin Name: Print On Demand With Personalization
 * Plugin URI: https://iconecom.com/woo-commerce/
 * Description: View realtime personalization for IconEcom/PrintTech POD products
 * Version: 1.2.5
 * Author: PrintTech
 * Author URI: https://iconecom.com/
 */



function podwp_printtech_load_preview_script() {
    global $post;
    wp_enqueue_script( 'jquery' );
    $is_customized_product = $post && get_post_meta( $post->ID, 'pf_customizable', true );
    if ($is_customized_product || 1) {
        wp_enqueue_script( 'pt_personalization_preview', plugin_dir_url(__FILE__) . 'js.js?v=2');
    }
}

add_action( 'wp_enqueue_scripts', 'podwp_printtech_load_preview_script' );


/**
 * Add personalization fields to product page
 */
function podwp_printtech_woocommerce_custom_fields_display()
{
    global $post;
    $product = wc_get_product($post->ID);
    $custom_fields_woocommerce_title = $product->get_meta('pt_personalizations');
    if ($custom_fields_woocommerce_title) {
        // setup hidden input field for mockup id
        if( $product->is_type( 'variable' ) ){
            $variations = $product->get_available_variations();
            foreach($variations as $variation) {
                $mockup_id = base64_encode(get_post_meta($variation['variation_id'], 'pt_session_id', true ));
                printf(
                    '<input type="hidden" id="variation%s" value="%s" />',
                    esc_html($variation['variation_id']),
                    esc_html($mockup_id)
                );
                printf(
                    '<input type="hidden" id="sku%s" value="%s" />',
                    esc_html($variation['variation_id']),
                    esc_html($variation['sku'])
                );
            }
            printf(
                '<input type="hidden" id="sku" value="%s" />',
                esc_html($variation['sku'])
            );
            $sku = $variation['sku'];
        } else {
            $mockup_id = base64_encode($product->get_meta('pt_session_id'));
            printf(
                '<input type="hidden" id="variation%s" value="%s" />',
                esc_html($post->ID),
                esc_html($mockup_id)
            );
            printf(
                '<input type="hidden" id="sku%s" value="%s" />',
                esc_html($post->ID),
                esc_html($product->get_sku())
            );
            printf(
                '<input type="hidden" id="sku" value="%s" />',
                esc_html($product->get_sku())
            );
            $sku = $product->get_sku();
        }


        $productId = explode('-', $sku)[1];
//        $productId = 167434;
        // get config data from json:
        $configUrl = sprintf(
            'https://printtechnew.s3.amazonaws.com/productConfig/%s.json',
            $productId
        );
        $json = @file_get_contents($configUrl);
        if (!empty($json)) {
            $previewSettings = json_decode($json, true);
            wp_cache_set('previewSettings', $previewSettings);
        } else if ($custom_fields_woocommerce_title) {
            $previewSettings['hide_personalization_fields'] = true;
            wp_cache_set('previewSettings', $previewSettings);
        }


        $display = '';
        if ($previewSettings['hide_personalization_fields']) {
            $display = "display:none;";
        }

        // include modal html
//        include 'modals/modal.php';
        if(is_array($custom_fields_woocommerce_title)) {
            $fieldsArr = $custom_fields_woocommerce_title;
        } else {
            $fieldsArr = json_decode($custom_fields_woocommerce_title);
        }
        if (!$previewSettings['hide_personalization_fields']) {
            ?>
            <div class="js_personalization_label">
                <label>Personalization:</label>
            </div>
            <?php
        }?>
        <div class="printTechPersonalization row col-12">

            <?php
            if (is_array($fieldsArr)) {
                // add via JS call back to handle mutliple SKU/Bundle types on one page
                foreach ($fieldsArr as $fieldHolder) {
                    printf(
                        '<div style="padding-bottom: 10px; %s"><input type="text" name="PTPersonalizations[]" class="js_personalization_fields" placeholder="%s" required="required"><br /></div>',
                        esc_html($display),
                        esc_html($fieldHolder)
                    );
                }
                if (!$previewSettings['hide_personalization_fields']) {
                    ?>
                    <div style="padding-bottom: 10px; display: table">
                        <button type="button" class="button alt wc-variation-selection-needed js_customization_btn"
                                title="Select variant">Preview Personalization
                        </button>
                        <button style="background-color: green; color: white; display: none"
                                class="button alt js_select_variants">Select options above to preview personalization
                        </button>
                    </div>
                    <?php
                }
            }?>
        </div>

        <?php
    } else {
        // Still add preview personalization to DOM, incase other manually added variants have personalization
        // This allows JS to show button if needed
        ?>
        <!--<div class="printTechPersonalization row col-12" style="display: none;">
            <div style="padding-bottom: 10px; display: table">
                <button type="button" class="button alt wc-variation-selection-needed js_customization_btn"
                        title="Select variant">Preview Personalization
                </button>
                <button style="background-color: green; color: white; display: none"
                        class="button alt js_select_variants">Select options above to preview personalization
                </button>
            </div>
        </div>-->
        <?php

    }
}

add_action('woocommerce_before_add_to_cart_button', 'podwp_printtech_woocommerce_custom_fields_display');
function podwp_printtech_after_cart () {
    $previewSettings = wp_cache_get('previewSettings');
    if (isset($previewSettings['hide_personalization_fields'])) {
        ?>
        <div style="padding-bottom: 10px; display: table">
            <button type="button" class="button alt wc-variation-selection-needed js_customization_btn"
                    title="Select variant">Start Personalization
            </button>
            <input type="hidden" id="hideCart" value="1" />
            <button style="background-color: green; color: white; display: none"
                    class="button alt js_select_variants">Select options above to Start Personalization
            </button>
        </div>
        <?php
    }
}
add_action('woocommerce_after_add_to_cart_button', 'podwp_printtech_after_cart');


/**
 * Add the text field as item data to the cart object
 * @since 1.0.0
 * @param Array $cart_item_data Cart item meta data.
 * @param Integer $product_id Product ID.
 * @param Integer $variation_id Variation ID.
 * @param Boolean $quantity Quantity
 *
 * Add personalization fields to cart meta data
 */
function podwp_printtech_add_custom_field_item_data($cart_item_data, $product_id, $variation_id, $quantity)
{
    if (!empty($_POST['PTPersonalizations'])) {
        // Add the item data
        if (is_array($_POST['PTPersonalizations'])) {
            $cart_item_data['PTPersonalizations'] = array_map('sanitize_text_field', $_POST['PTPersonalizations']);
        } else {
            $cart_item_data['PTPersonalizations'] = sanitize_text_field($_POST['PTPersonalizations']);
        }
    }
    return $cart_item_data;
}

add_filter('woocommerce_add_cart_item_data', 'podwp_printtech_add_custom_field_item_data', 10, 4);

/**
 * Display the custom field value in the cart
 * @since 1.0.0
 */
function podwp_printtech_cart_item_name($name, $cart_item, $cart_item_key)
{
    if (isset($cart_item['PTPersonalizations'])) {
        if (is_array($cart_item['PTPersonalizations'])) {
            unset($cart_item['PTPersonalizations']['imageKey']);
            if (count($cart_item['PTPersonalizations'])) {
                $name .= sprintf(
                    '<p>Personalization: %s</p>',
                    stripslashes(implode(', ', $cart_item['PTPersonalizations']))
                );
            }
        } else {
            $name .= '<p>Personalization added to bundle</p>';
        }
    }
    return $name;
}

add_filter('woocommerce_cart_item_name', 'podwp_printtech_cart_item_name', 10, 3);

/**
 * Add custom field to order object
 */
function podwp_printtech_add_custom_data_to_order( $item, $cart_item_key, $values, $order ) {
    foreach( $item as $cart_item_key=>$values ) {
        if( isset( $values['PTPersonalizations'] ) ) {
            $item->add_meta_data( __( 'PTPersonalizations', 'pt' ), $values['PTPersonalizations'], true );
        }
    }
}
add_action( 'woocommerce_checkout_create_order_line_item', 'podwp_printtech_add_custom_data_to_order', 10, 4 );

add_action( 'admin_menu', 'podwp_printtech_admin_menu' );

function podwp_printtech_admin_menu() {
    add_menu_page( 'PrintTech Dashboard', 'PrintTech', 'manage_options', 'printtech-dashboard', 'podwp_printtech_dashboard_content', 'https://printtechnew.s3.amazonaws.com/PrintTechIcon.png', 58);
}

function podwp_printtech_dashboard_content() {
    ?>
    <p>
        Login to your acount below to get started:
    </p>
    <a class="button-primary ast_notice_btn" href="https://dashboard.iconecom.com/dashboard/pages/account/integrations/connectWoo.php?wooUrl=<?php echo get_site_url()?>" target="_blank">
        Login
    </a>
    <?php
}