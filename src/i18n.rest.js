angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', ['i18nFetchMessage', 'topicRegistry', I18nMessageReaderFactory])
    .factory('i18nFetchMessage', ['$http', function ($http) {
        return I18nFetchMessageFactory($http)
    }])
    .factory('i18nMessageWriter', ['$http', 'restServiceHandler', 'topicRegistry', I18nMessageWriterFactory]);

function I18nMessageReaderFactory(i18nFetchMessage, topicRegistry) {
    var baseUri = '';
    topicRegistry.subscribe('config.initialized', function (config) {
        baseUri = config.baseUri || '';
    });

    return function (ctx, onSuccess, onError) {
        var config = {};
        if (ctx.locale) config.headers = {'Accept-Language': ctx.locale};
        i18nFetchMessage(baseUri + 'api/i18n/translate?' + (ctx.namespace ? 'namespace=' + ctx.namespace + '&' : '') + 'key=' + ctx.code, config)
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

function I18nMessageWriterFactory($http, restServiceHandler, topicRegistry) {
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

        presenter.params = {
            method: 'POST',
            url: baseUri + 'api/i18n/translate',
            data: payload,
            withCredentials: true
        };
        if (ctx.locale) presenter.params.headers = {'Accept-Language': ctx.locale};
        restServiceHandler(presenter);
    }
}