(function () {
    angular.module('i18n.gateways', ['i18n.over.rest'])
        .factory('i18nMessageReader', ['iorMessageReader', Wrap])
        .factory('i18nMessageWriter', ['iorMessageWriter', Wrap])
        .run(['installRestDefaultHeaderMapper', 'topicRegistry', function(installRestDefaultHeaderMapper, topicRegistry) {
            var locale = 'default';
            topicRegistry.subscribe('i18n.locale', function(msg) {
                locale = msg;
            });
            installRestDefaultHeaderMapper(function(headers) {
                if (!headers['accept-language']) headers['accept-language'] = locale;
                return headers;
            })
        }]);

    function Wrap(it) {
        return it;
    }
})();
