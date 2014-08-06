angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', ['i18nFetchMessage', 'topicRegistry', '$cacheFactory', I18nMessageReaderFactory])
    .factory('i18nFetchMessage', ['$http', function ($http) {
        return I18nFetchMessageFactory($http)
    }])
    .factory('i18nMessageWriter', ['$http', 'restServiceHandler', 'topicRegistry', '$cacheFactory', I18nMessageWriterFactory])
    .run(function(installRestDefaultHeaderMapper, topicRegistry, $cacheFactory) {
        var locale = 'default';
        topicRegistry.subscribe('i18n.locale', function(msg) {
            locale = msg;
            $cacheFactory.get('i18n').removeAll();
        });
        installRestDefaultHeaderMapper(function(headers) {
            headers['accept-language'] = locale;
            return headers;
        })
    });

function I18nMessageReaderFactory(i18nFetchMessage, topicRegistry, $cacheFactory) {
    var baseUri = '';
    topicRegistry.subscribe('config.initialized', function (config) {
        baseUri = config.baseUri || '';
    });

    return function (ctx, onSuccess, onError) {
        var config = {};
        if (ctx.locale) config.headers = {'Accept-Language': ctx.locale};
        config.cache = $cacheFactory.get('i18n');

        i18nFetchMessage(baseUri + 'api/i18n/translate?' +
            (ctx.namespace ? 'namespace=' + ctx.namespace + '&' : '') +
            'key=' + encodeURIComponent(ctx.code), config)
            .success(function (it) {
                if (onSuccess) onSuccess(it)
            })
            .error(function () {
                if (onError) onError();
            });
    }
}

function I18nFetchMessageFactory($http) {
    return function (uri, config) {
        return $http.get(uri, config);
    }
}

function I18nMessageWriterFactory($http, restServiceHandler, topicRegistry, $cacheFactory) {
    var baseUri = '';
    topicRegistry.subscribe('config.initialized', function (config) {
        baseUri = config.baseUri || '';
    });

    return function (ctx, presenter) {
        var payload = {
            key: ctx.key,
            message: ctx.message
        };
        if (ctx.namespace) payload.namespace = ctx.namespace;

        $cacheFactory.get('i18n').put(baseUri + 'api/i18n/translate?' +
            (ctx.namespace ? 'namespace=' + ctx.namespace + '&' : '') +
            'key=' + encodeURIComponent(ctx.key), ctx.message);

        presenter.params = {
            method: 'POST',
            url: baseUri + 'api/i18n/translate',
            data: payload,
            withCredentials: true
        };
        restServiceHandler(presenter);
    }
}