angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', ['config', '$http', I18nMessageReaderFactory])
    .factory('i18nFetchMessage', ['$http', function ($http) {
        return I18nFetchMessageFactory($http)
    }])
    .factory('i18nMessageWriter', ['config', 'restServiceHandler', I18nMessageWriterFactory])
    .run(function(installRestDefaultHeaderMapper, topicRegistry) {
        var locale = 'default';
        topicRegistry.subscribe('i18n.locale', function(msg) {
            locale = msg;
        });
        installRestDefaultHeaderMapper(function(headers) {
            if (!headers['accept-language']) headers['accept-language'] = locale;
            return headers;
        })
    });

function I18nMessageReaderFactory(config, $http) {
    return function (ctx, onSuccess, onError) {
        var requestConfig = {};
        if (ctx.locale) requestConfig.headers = {'Accept-Language':ctx.locale};
        $http.get((config.baseUri || '') + 'api/i18n/translate?' +
            (ctx.namespace ? 'namespace=' + ctx.namespace + '&' : '') +
            'key=' + encodeURIComponent(ctx.code), requestConfig)
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

function I18nMessageWriterFactory(config, restServiceHandler) {
    return function (ctx, presenter) {
        var payload = {
            key: ctx.key,
            message: ctx.message
        };
        if (ctx.namespace) payload.namespace = ctx.namespace;

        presenter.params = {
            method: 'POST',
            url: (config.baseUri || '') + 'api/i18n/translate',
            data: payload,
            withCredentials: true
        };
        restServiceHandler(presenter);
    }
}