describe('i18n.rest', function () {
    var $httpBackend, topics, http;
    var config;
    var i18nCache;

    beforeEach(module('i18n.gateways'));
    beforeEach(module('rest.client'));
    beforeEach(module('notifications'));
    beforeEach(inject(function ($injector, topicRegistryMock, $http, $cacheFactory) {
        $httpBackend = $injector.get('$httpBackend');
        topics = topicRegistryMock;
        config  = {};
        http = $http;
        i18nCache = $cacheFactory.get('i18n');
    }));
    afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });

    describe('on module load', function() {
        var headers, returnedHeaders;

        it('then a default header mapper should be installed', inject(function(installRestDefaultHeaderMapper) {
            expect(installRestDefaultHeaderMapper.calls[0].args[0]).toBeDefined();
        }));

        it('i18n cache is initialized', inject(function ($cacheFactory) {
            expect($cacheFactory.get('i18n')).toBeDefined();
        }));

        describe('given locale is not broadcasted', function() {
            beforeEach(inject(function(installRestDefaultHeaderMapper) {
                headers = {};
                returnedHeaders = installRestDefaultHeaderMapper.calls[0].args[0](headers);
            }));

            it('then accept-language header is default', function() {
                expect(headers['accept-language']).toEqual('default');
            });

            it('then returned headers are source headers', function() {
                expect(returnedHeaders).toEqual(headers);
            });
        });

        describe('given locale is broadcasted', function() {

            beforeEach(inject(function(installRestDefaultHeaderMapper, topicRegistryMock) {
                headers = {};
                i18nCache.put('key', 'value');

                topicRegistryMock['i18n.locale']('locale');
                returnedHeaders = installRestDefaultHeaderMapper.calls[0].args[0](headers);
            }));

            it('then accept-language header is broadcasted locale', function() {
                expect(headers['accept-language']).toEqual('locale');
            });

            it('then returned headers are source headers', function() {
                expect(returnedHeaders).toEqual(headers);
            });

            it('then i18n cache is cleared', function () {
                expect(i18nCache.info()).toEqual({id: 'i18n', size: 0});
            });
        });

    });

    describe('reader', function () {
        var reader;
        var namespace = 'namespace';
        var code = 'translation.code';
        var translation = 'translation message';
        var defaultTranslation = 'default translation';
        var receivedTranslation;
        var receivedError;
        var onSuccess = function (translation) {
            receivedTranslation = translation;
        };
        var onError = function () {
            receivedError = true;
        };
        var context;

        beforeEach(inject(function (i18nMessageReader) {
            reader = i18nMessageReader;
            receivedTranslation = '';
            receivedError = false;
            context = {};
        }));

        it('subscribes for config.initialized notifications', function () {
            expect(topics['config.initialized']).toBeDefined();
        });

        function testHttpCallsWithPrefix(prefix) {
            it('on execute perform GET request with the code', function () {
                $httpBackend.expect('GET', prefix + 'api/i18n/translate?key=' + encodeURIComponent(code)).respond(200);
                context.code = code;
                reader(context);
                $httpBackend.flush();
            });
            it('on execute perform GET request with the code and namespace', function () {
                $httpBackend.expect('GET', prefix + 'api/i18n/translate?namespace=' + namespace + '&key=' + encodeURIComponent(code)).respond(200);
                context.namespace = namespace;
                context.code = code;
                reader(context);
                $httpBackend.flush();
            });
            it('pass translation to on success handler', function () {
                $httpBackend.when('GET', /.*/).respond(200, translation);
                reader(context, onSuccess);
                $httpBackend.flush();
                expect(receivedTranslation).toEqual(translation);
            });
            it('on error trigger on error handler', function () {
                $httpBackend.when('GET', /.*/).respond(404);
                context.default = defaultTranslation;
                reader(context, onSuccess, onError);
                $httpBackend.flush();
                expect(receivedError).toEqual(true);
            });
            it('requests should be cached', function () {
                spyOn(http, 'get').andCallThrough();
                $httpBackend.expect('GET', '').respond(200);
                reader(context);
                $httpBackend.flush();

                expect(http.get.mostRecentCall.args[1].cache).toEqual(i18nCache);
            });
        }

        testHttpCallsWithPrefix('');
        describe('with config.initialized notification received', function () {
            beforeEach(function () {
                config.baseUri = 'http://host/context/';
                topics['config.initialized'](config);
            });

            testHttpCallsWithPrefix('http://host/context/');
        });

        describe('with config.initialized notification received without baseUri', function () {
            beforeEach(function () {
                topics['config.initialized'](config);
            });

            testHttpCallsWithPrefix('');
        });

        describe('code should be uri encoded', function () {
            beforeEach(function () {
                code = 'Foo & Bar';
            });

            testHttpCallsWithPrefix('');
        });
    });

    describe('writer', function () {
        var writer;
        var code = 'translation.code';
        var translation = 'translation message';
        var namespace = 'namespace';
        var locale = 'locale';
        var receivedSuccess;
        var receivedError;
        var receivedStatus;
        var receivedBody;
        var onSuccess = function () {
            receivedSuccess = true;
        };
        var onError = function (body, status) {
            receivedError = true;
            receivedStatus = status;
            receivedBody = body;
        };
        var context;
        var rest;
        var presenter;

        beforeEach(inject(function (i18nMessageWriter, restServiceHandler) {
            rest = restServiceHandler;
            writer = i18nMessageWriter;
            receivedSuccess = false;
            receivedError = false;
            context = {};
            presenter = {
                success:onSuccess
            }
        }));

        it('subscribes for config.initialized notifications', function () {
            expect(topics['config.initialized']).toBeDefined();
        });

        function expectRestCallFor(ctx) {
            expect(rest.calls[0].args[0].params).toEqual(ctx);
        }

        describe('given required context fields', function() {
            var key;

            beforeEach(function() {
                context.key = code;
                context.message = translation;
                key = 'api/i18n/translate?key=' + code;
            });

            describe('on execute', function() {
                beforeEach(function() {
                    i18nCache.put(key, 'old translation');
                    writer(context, presenter);
                });

                it('performs rest call', function() {
                    expectRestCallFor({
                        method:'POST',
                        url:'api/i18n/translate',
                        data:{key: code, message: translation},
                        withCredentials:true
                    });
                });

                it('i18n cache is updated', function () {
                    expect(i18nCache.get(key)).toEqual(translation);
                });
            });

            describe('and optional context fields', function() {

                beforeEach(function() {
                    context.namespace = namespace;
                    context.locale = locale;
                    key = 'api/i18n/translate?namespace=' + namespace + '&key=' + code;
                });

                describe('on execute', function() {
                    beforeEach(function() {
                        i18nCache.put(key, 'old translation');
                        writer(context, presenter);
                    });

                    it('performs rest call', function() {
                        expectRestCallFor({
                            method:'POST',
                            url:'api/i18n/translate',
                            data:{key: code, message: translation, namespace:namespace},
                            withCredentials:true
                        });
                    });

                    it('i18n cache is updated', function () {
                        expect(i18nCache.get(key)).toEqual(translation);
                    });
                });
            });
        });

        function testHttpCallsWithPrefix(prefix) {
            it('on execute', function () {
                context.key = code;
                context.message = translation;
                writer(context, {
                    success:onSuccess,
                    error:onError
                });
                expectRestCallFor({
                    method:'POST',
                    url:prefix + 'api/i18n/translate',
                    data:{key: code, message: translation},
                    withCredentials:true
                });
            });
        }

        testHttpCallsWithPrefix('');
        describe('with baseuri', function () {
            beforeEach(function () {
                config.baseUri = 'http://host/context/';
                topics['config.initialized'](config);
            });

            testHttpCallsWithPrefix('http://host/context/');
        });

        describe('without baseUri', function () {
            beforeEach(function () {
                topics['config.initialized'](config);
            });

            testHttpCallsWithPrefix('');
        });
    });
});