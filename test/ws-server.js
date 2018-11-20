var assert = require('assert'),
    PocketNodeServer = require('../src/server'),
    appRootPath = require('app-root-path').toString(),
    path = require('path'),
    PluginManager = require('../src/plugin-manager'),
    WebSocket = require('ws');

// Tests the websocket interface
describe('Pocket Node Websocket Server', function () {
    var pocketNodeServer = null,
        wsClient = null;
    const POCKET_NODE_SERVER_PORT = 8000;

    before(function (done) {
        pocketNodeServer = new PocketNodeServer(POCKET_NODE_SERVER_PORT, null, false, true, false);
        pocketNodeServer.start(async function () {
            await PluginManager.registerPlugin(path.join(appRootPath) + '/test/test_plugin');
            await PluginManager.configurePlugin('TEST', {
                '5777': {
                    test_config_1: "test value"
                }
            });
            done();
        });
    });

    beforeEach(function() {
        // Create ws client
        wsClient = new WebSocket('ws://localhost:' + POCKET_NODE_SERVER_PORT, {
            perMessageDeflate: false
        });
    });

    after(async function () {
        await PluginManager.removePlugin('TEST');
        pocketNodeServer.close();
    });

    it('should listen', function () {
        assert.equal(pocketNodeServer.webServer.server.listening, true);
    });

    describe('/health', function() {
        it('should return the node information', function(done) {
            wsClient.on('message', function(data) {
                //console.log(data);
                var responseObj = JSON.parse(data);
                assert(responseObj, {
                    "version": "0.0.11",
                    "networks": [{
                        "network": "TEST",
                        "version": "0.0.1",
                        "package_name": "test-plugin",
                        "subnetworks": ["5777"]
                    }]
                });
                done();
            });

            wsClient.on('open', function() {
                wsClient.send(JSON.stringify({
                    'url': '/health',
                    'payload': {}
                }));
            });
        });
    });

    describe('/transactions', function() {
        it('should submit a valid transaction', function () {
            wsClient.on('message', function (data) {
                const responseObj = JSON.parse(data),
                    expectedResponse = {
                        network: 'TEST',
                        subnetwork: '5777',
                        serialized_tx: '0x000',
                        tx_metadata: {},
                        hash: '0x0',
                        metadata: {},
                        error: false,
                        error_msg: null
                    };
                assert.equal(responseObj.network, expectedResponse.network);
                assert.equal(responseObj.subnetwork, expectedResponse.subnetwork);
                assert.equal(responseObj.serialized_tx, expectedResponse.serialized_tx);
                assert.equal(responseObj.hash, expectedResponse.hash);
                assert.equal(responseObj.error, expectedResponse.error);
                assert.equal(responseObj.error_msg, expectedResponse.error_msg);
            });

            wsClient.on('open', function () {
                wsClient.send(JSON.stringify({
                    'url': '/transactions',
                    'payload': {
                        network: 'TEST',
                        subnetwork: '5777',
                        serialized_tx: '0x000',
                        tx_metadata: {}
                    }
                }));
            });
        });
    });

    describe('/queries', function() {
        it('should execute a valid query', function () {
            wsClient.on('message', function (data) {
                const responseObj = JSON.parse(data);
                const expectedResponse = {
                    network: 'TEST',
                    subnetwork: '5777',
                    result: true,
                    decoded: false,
                    error: false,
                    error_msg: null
                };
                assert.equal(responseObj.network, expectedResponse.network);
                assert.equal(responseObj.subnetwork, expectedResponse.subnetwork);
                assert.equal(responseObj.result, expectedResponse.result);
                assert.equal(responseObj.decoded, expectedResponse.decoded);
                assert.equal(responseObj.error, expectedResponse.error);
                assert.equal(responseObj.error_msg, expectedResponse.error_msg);
            });

            wsClient.on('open', function () {
                wsClient.send(JSON.stringify({
                    'url': '/queries',
                    'payload': {
                        network: "TEST",
                        subnetwork: '5777',
                        query: {},
                        decoder: {}
                    }
                }));
            });
        });
    });
});
