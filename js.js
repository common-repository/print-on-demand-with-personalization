/* Using a self-executing anonymous function - (function(){})(); - so that all variables and functions defined within
arenâ€™t available to the outside world. */

(function(){

    'use strict';

    /* This is my app's JavaScript */
    var myAppJavaScript = function($){
        var previewSettings = {};
        var selectedId = false;
        var selectedSku = '';
        // setup preview/additional options from json file
        $(document).ready(function() {
            if($('#hideCart').val() == 1) {
                $('.single_add_to_cart_button').hide();
            }

            /**
             Store settings and currently loaded custom productid and bundle id global
             on variant selection check if loaded IDs match
             If so no change
             If not:
                 If bundle: Check if bundle has personalization (last digit in SKU) and setup button appropriately and load Json
                 If Custom Product: Load Json
             */

            $( ".single_variation_wrap" ).on( "show_variation", function ( event, variation ) {
                // Fired when the user selects all the required dropdowns / attributes
                // and a final variation is selected / shown
                var sku = $('#sku'+ variation.variation_id).val();
                if (typeof sku !== 'undefined') {
                    updatePreviewSettings(sku, true, false);
                }

            });


        });

        function updatePreviewSettings(sku, async, loadComplete) {
            var configUrl = 'https://printtechnew.s3.amazonaws.com/productConfig/';
            var bundleConfigUrl = 'https://printtechnew.s3.amazonaws.com/bundleConfig/';

            var ids = sku.split('-');
            var selectProductId = ids[1];
            if (selectedId !== selectProductId) {
                // Different product selected
                // load json Config
                if (ids[0] === "bun") {
                    $('.js_personalization_fields').parent().hide();
                    $('.js_personalization_label').hide();
                    if (ids[3]) {
                        // bundle has personalization
                        showPersonalization(true);
                        var selectedConfigUrl = bundleConfigUrl + ids[1] +'.json?' + new Date().getTime();
                    } else {
                        // bundle does not have personalization
                        hidePersonalization();
                        return;
                    }

                } else if (ids[0] === "cust") {
                    // if custom Product
                    var selectedConfigUrl = configUrl + ids[1] +'.json?' + new Date().getTime();
                }
                $.ajax({
                    dataType: "json",
                    url: selectedConfigUrl,
                    cache: false,
                    type: 'GET',
                    crossDomain: true,
                    success: function (data, status, xhr) {
                        previewSettings = data;
                        selectedId = ids[1];
                        selectedSku = sku;
                        var hideCart = true;
                        if (data.hide_personalization_fields === false && $('.js_personalization_fields').length) {
                            hideCart = false;
                        }
                        showPersonalization(hideCart);
                        if (loadComplete) {
                            loadOnComplete(sku);
                        }
                    },
                    error: function (xhr, textStatus, errorThrown) {
                        // no personalization
                        hidePersonalization();
                    }
                });
            } else if (loadComplete) {
                loadOnComplete(sku);
            }

        }

        function showPersonalization(hideCart) {
            $('.js_customization_btn').show();
            if (hideCart) {
                $('.single_add_to_cart_button').hide();
            } else {
                $('.single_add_to_cart_button').show();
            }

        }

        function hidePersonalization() {
            $('.js_customization_btn').hide();
            $('.single_add_to_cart_button').show();
        }

        $(document).on('click', "#closeModal", function() {
            $('.pt-preview-modal').remove();
        });
        $(document).on('click', ".js_customization_btn", function() {
            // get variant id
            var variation_id = $('input[name="variation_id"]').val();

            if (!variation_id) {
                // check if single variant
                variation_id = $('button[name="add-to-cart"]').val();
            }

            // get mockup id is selected variant
            var sku = $('#sku'+ variation_id).val();

            if (!variation_id || variation_id === "0") {
                $('.js_select_variants').slideDown().delay(3000).slideUp();
                return;
            }

            // check that preview settings are up to date
            updatePreviewSettings(sku, false, true);

        });

        function loadOnComplete(sku) {
            var ids = sku.split('-');
            if (ids[0] === "cust") {
                var colorid = ids[3]
                var mockup_id = previewSettings.mockupsByColor[colorid];
                var url = 'https://builder.printexinc.com/preview/' + mockup_id + '?productId='+ ids[1] +'&colorId='+ colorid + '&' + $.param($('.js_personalization_fields'));
            } else if (ids[0] === "bun") {
                var sortOrder = false;
                if (previewSettings.sortOrder) {
                    var customProductId = previewSettings.sortOrder[0];
                    sortOrder = true;
                }
                // get bundleid and bundle matrix id
                var bundleId = ids[1];
                var bundleMatrixId = ids[2];

                var bundleMatrixObject = previewSettings.bundleMatrixData[bundleMatrixId];
                if (sortOrder) {
                    var firstObject = bundleMatrixObject[customProductId];
                } else {
                    var firstObject = bundleMatrixObject[Object.keys(bundleMatrixObject)[0]];
                    var customProductId = firstObject.customProductId;

                }

                // get selected color
                var colorId = firstObject.colorId;
                var mockup_id = previewSettings.bundleProductData[customProductId].mockupsByColor[colorId];
                var url = 'https://builder.printexinc.com/preview/' + mockup_id + '?bundleId=' + bundleId + '&bundleMatrixId=' + bundleMatrixId + '&productId=' + customProductId + '&' + $.param($('.js_personalization_fields'));
            }

            loadModal(url);
        }

        function loadModal(url) {
            // create iframe
            var isMobileSafari = false;
            var userAgent = (window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : false;

            if (userAgent && userAgent.match(/iPhone|iPad|iPod/i)) {
                isMobileSafari = true;
            }

            var modal = document.createElement('div');
            modal.className = 'pt-preview-modal';
            modal.setAttribute('style', 'position: fixed; z-index: 2147483648; padding: 20px; top: 0; width: 100%; height: 100%; left: 0; background: rgba(0, 0 , 0, 0.6); box-sizing: border-box;');


            var modalHeader = document.createElement('div');
            modalHeader.setAttribute('style', 'padding: 15px; border-bottom: 1px solid #e5e5e5; overflow:hidden; position:absolute; top:0; left:0; width:100%; box-sizing: border-box;');

            var closeBtn = document.createElement('button');
            closeBtn.setAttribute('style', 'height:30px; width:30px; cursor:pointer; border:0px; background:0 0; padding:0; -webkit-appearance:none; color:#000; float:right; background:none;');
            closeBtn.setAttribute('id', 'closeModal');
            var closeImg = document.createElement('img');
            closeImg.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAAAXNSR0IArs4c6QAAAgVJREFUaAXtmU2KwkAQhZ0hQbyDu7mIB3PhwoN5EXfeIYguJo9JQRMydurnNYxTDTH+dNWr71VD2mSzyZEOpAPpQDqQDqQD6UA6kA6kA80dOJ1O++Px+NVKGFrQ9Oh9WoMhPAzD5fF4XFpAQwNa0PRAf1iABXaMle7e+r4/nM/nqyVfLUZgx3nS3etutzuMddxqsfPf1cALsJKTAr0AK3omaPWSfj6f21ERx3zso5f3C1hob6da5nW8/KzuMLJVCgnpNEvDBMyGZsGibjMwC5oJ6waOhmbDhgBHQbeADQP2QreCDQW2QreEDQfWQreGpQCvhcY8bFTGk2wX8ZWMkGu5JCvPrstSmWj+vta9aX5TWGjSgJG8Ao0p80HrrAhRgSGigKbDoh468EroJrCoRf1vCUF/edA7/K+WtAJWFg19adM6XIGVWzPvcVmqweL+F1r6FhuPNbBys08zV9a89xy6pC0AlhgPdBiwp3BPrBY+BDii4Igca+DdwJGFRub6Dd4FzCiQkbOENwMzC2PmNgEzC5JusDTUwKxCBLQ8M7TU/5a6rruPReGYj/B9MDYo065MtqKl5n2qpfyu+l7dYWRceIIYDltWvtBp05ND5DQBI7CA3jKfDUMLo4C+W58N/2RyvAIahThSqEKhBU1VUE5OB9KBdCAdSAfSgXQgHUgH0oEQB74BG1sUIwNoL3cAAAAASUVORK5CYII=';
            closeImg.setAttribute('style', 'height:30px; width:30px;');
            closeBtn.appendChild(closeImg);
            modalHeader.appendChild(closeBtn);

            var modalHeaderTitle = document.createElement('h4');
            modalHeaderTitle.className = 'preview-title';
            modalHeaderTitle.setAttribute('style', 'float: left;font-weight:bold;font-size:23px;color:#222;line-height:30px;margin:0px;clear:none;');
            modalHeaderTitle.innerText = 'Preview Personalization';
            modalHeader.appendChild(modalHeaderTitle);

            var modalContent = document.createElement('div');
            modalContent.setAttribute('style', 'background-color: #fff; width: 100%; height: 100%;overflow:hidden;position:relative');
            modalContent.appendChild(modalHeader);

            var styles = document.createElement('style');
            styles.innerHTML = '@media screen and (max-width: 768px) { .preview-title {font-size: 16px !important;} }';
            modalContent.appendChild(styles);

            modal.appendChild(modalContent);

            var iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.width = '100%';
            iframe.height = '100%';

            if (isMobileSafari) {
                var iframeWrapper = document.createElement('div');
                iframeWrapper.setAttribute('style', '-webkit-overflow-scrolling: touch; overflow: scroll; height: 100%; top: 61px; box-sizing: border-box; position: absolute; width: 100%; padding-bottom: 60px;');
                iframe.setAttribute('style', 'border: 0; box-sizing: border-box;');
                iframeWrapper.appendChild(iframe);
                modalContent.appendChild(iframeWrapper);
            } else {
                iframe.setAttribute('style', 'border: 0; padding-top: 60px; box-sizing: border-box;');
                modalContent.appendChild(iframe);
            }

            document.body.appendChild(modal);
        }

        window.addEventListener("message", function (message) {
            if (message.data.event === "addToCart") {
                var ids = selectedSku.split('-');
                if (ids[0] === "cust") {
                    // loop through text
                    // remove and re add all personalization fields
                // <input type="text" name="PTPersonalizations[]" class="js_personalization_fields" placeholder="%s" required="required">
                    $('.js_personalization_fields').remove();
                    if (message.data.personalizations) {
                        $('<input>').attr({
                            type: 'hidden',
                            id: 'personalization',
                            name: 'PTPersonalizations',
                            value: JSON.stringify(message.data.personalizations)
                        }).appendTo('form');
                    } else {
                        $.each(message.data.texts, function (index, value) {
                            $('<input>').attr({
                                type: 'hidden',
                                name: 'PTPersonalizations[]',
                                value: value
                            }).appendTo('form');
                        });
                    }
                    if (message.data.customImageKey) {
                        $('<input>').attr({
                            type: 'hidden',
                            id: 'customImageKey',
                            name: 'PTPersonalizations[imageKey]',
                            value: message.data.customImageKey
                        }).appendTo('form');
                    }
                } else if (ids[0] === "bun") {
                    $('<input>').attr({
                        type: 'hidden',
                        id: 'personalization',
                        name: 'PTPersonalizations',
                        value: JSON.stringify(message.data.personalizations)
                    }).appendTo('form');
                }

                $('.pt-preview-modal').remove();

                $('.single_add_to_cart_button').click();
            }
        }, false);

    };
    myAppJavaScript(jQuery);
})();