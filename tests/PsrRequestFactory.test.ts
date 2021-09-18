import ArgumentCallback from '@chubbyjs/chubbyjs-mock/dist/Argument/ArgumentCallback';
import ArgumentInstanceOf from '@chubbyjs/chubbyjs-mock/dist/Argument/ArgumentInstanceOf';
import Call from '@chubbyjs/chubbyjs-mock/dist/Call';
import MockByCalls, { mockByCallsUsed } from '@chubbyjs/chubbyjs-mock/dist/MockByCalls';
import ServerRequestFactoryInterface from '@chubbyjs/psr-http-factory/dist/ServerRequestFactoryInterface';
import StreamFactoryInterface from '@chubbyjs/psr-http-factory/dist/StreamFactoryInterface';
import UriFactoryInterface from '@chubbyjs/psr-http-factory/dist/UriFactoryInterface';
import ServerRequestInterface, { QueryParams } from '@chubbyjs/psr-http-message/dist/ServerRequestInterface';
import UriInterface from '@chubbyjs/psr-http-message/dist/UriInterface';
import { describe, expect, test } from '@jest/globals';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import * as Stream from 'stream';
import { Duplex, PassThrough } from 'stream';
import PsrRequestFactory from '../src/PsrRequestFactory';
import ServerRequestDouble from './Double/ServerRequestDouble';
import ServerRequestFactoryDouble from './Double/ServerRequestFactoryDouble';
import StreamFactoryDouble from './Double/StreamFactoryDouble';
import UriDouble from './Double/UriDouble';
import UriFactoryDouble from './Double/UriFactoryDouble';

const mockByCalls = new MockByCalls();

describe('PsrRequestFactory', () => {
    describe('create', () => {
        test('failed cause missing method', () => {
            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble);
            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble);
            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory);

            const req = {
                ...({} as IncomingMessage),
            } as IncomingMessage;

            expect(() => {
                psrRequestFactory.create(req);
            }).toThrow('Method missing');

            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('failed cause missing url', () => {
            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble);
            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble);
            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory);

            const req = {
                ...({} as IncomingMessage),
                method: 'get',
            } as IncomingMessage;

            expect(() => {
                psrRequestFactory.create(req);
            }).toThrow('Url missing');

            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful', () => {
            const path = '/path';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody').with(new ArgumentInstanceOf(PassThrough)).willReturn(serverRequest),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('http://localhost' + path)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {},
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory);

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful maximal', () => {
            const path = '/path';
            const query = 'key1[key11]=value11&key2[]=value21&key2[]=value22';
            const cookie = 'name=value; name2=value2; name3=value3';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn(query)]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithHeaderCookie = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withHeader').with('cookie', cookie).willReturn(serverRequest),
            ]);

            const serverRequestWithHeaderHost = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withHeader').with('host', 'localhost:8080').willReturn(serverRequestWithHeaderCookie),
            ]);

            const serverRequestWithQueryParams = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withQueryParams')
                    .with(
                        new ArgumentCallback((queryParams: QueryParams) => {
                            expect(queryParams).toEqual({
                                key1: {
                                    key11: 'value11',
                                },
                                key2: ['value21', 'value22'],
                            });
                        }),
                    )
                    .willReturn(serverRequestWithHeaderHost),
            ]);

            const serverRequestWithCookieParams = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withCookieParams')
                    .with(
                        new ArgumentCallback((cookieParams: Map<string, string>) => {
                            expect(cookieParams).toEqual(
                                new Map<string, string>([
                                    ['name', 'value'],
                                    ['name2', 'value2'],
                                    ['name3', 'value3'],
                                ]),
                            );
                        }),
                    )
                    .willReturn(serverRequestWithQueryParams),
            ]);

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody')
                    .with(new ArgumentInstanceOf(PassThrough))
                    .willReturn(serverRequestWithCookieParams),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('http://localhost:8080' + path + '?' + query)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path + '?' + query,
                headers: {
                    ...({} as IncomingHttpHeaders),
                    host: 'localhost:8080',
                    cookie: cookie,
                    unknown: undefined,
                } as IncomingHttpHeaders,
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory);

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderCookie)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderHost)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithQueryParams)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithCookieParams)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('failed with reverse proxy cause missing headers', () => {
            const path = '/path';

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {},
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory, true);

            expect(() => {
                psrRequestFactory.create(req);
            }).toThrow('Missing "x-forwarded-proto", "x-forwarded-host", "x-forwarded-port" header(s).');

            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful with reverse proxy headers and do not allow them', () => {
            const path = '/path';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithHeaderXForwaredPort = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [Call.create('withHeader').with('x-forwarded-port', '8443').willReturn(serverRequest)],
            );

            const serverRequestWithHeaderXForwaredHost = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [
                    Call.create('withHeader')
                        .with('x-forwarded-host', 'example.com')
                        .willReturn(serverRequestWithHeaderXForwaredPort),
                ],
            );

            const serverRequestWithHeaderXForwaredProto = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [
                    Call.create('withHeader')
                        .with('x-forwarded-proto', 'https')
                        .willReturn(serverRequestWithHeaderXForwaredHost),
                ],
            );

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody')
                    .with(new ArgumentInstanceOf(PassThrough))
                    .willReturn(serverRequestWithHeaderXForwaredProto),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('http://localhost' + path)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {
                    ...({} as IncomingHttpHeaders),
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'example.com',
                    'x-forwarded-port': '8443',
                } as IncomingHttpHeaders,
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory);

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredPort)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredHost)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredProto)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful with reverse proxy headers and allow them', () => {
            const path = '/path';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithHeaderXForwaredPort = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [Call.create('withHeader').with('x-forwarded-port', '8443').willReturn(serverRequest)],
            );

            const serverRequestWithHeaderXForwaredHost = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [
                    Call.create('withHeader')
                        .with('x-forwarded-host', 'example.com')
                        .willReturn(serverRequestWithHeaderXForwaredPort),
                ],
            );

            const serverRequestWithHeaderXForwaredProto = mockByCalls.create<ServerRequestInterface>(
                ServerRequestDouble,
                [
                    Call.create('withHeader')
                        .with('x-forwarded-proto', 'https')
                        .willReturn(serverRequestWithHeaderXForwaredHost),
                ],
            );

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody')
                    .with(new ArgumentInstanceOf(PassThrough))
                    .willReturn(serverRequestWithHeaderXForwaredProto),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('https://example.com:8443' + path)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {
                    ...({} as IncomingHttpHeaders),
                    'x-forwarded-proto': 'https',
                    'x-forwarded-host': 'example.com',
                    'x-forwarded-port': '8443',
                } as IncomingHttpHeaders,
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory, true);

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredPort)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredHost)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderXForwaredProto)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful with overriden schema and host', () => {
            const path = '/path';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody').with(new ArgumentInstanceOf(PassThrough)).willReturn(serverRequest),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('https://example.com:8443' + path)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {},
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory, {
                schema: 'https',
                host: 'example.com:8443',
            });

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });

        test('successful with overriden schema', () => {
            const path = '/path';

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble);

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody').with(new ArgumentInstanceOf(PassThrough)).willReturn(serverRequest),
            ]);

            const serverRequestWithProtocolVersion = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequestWithProtocolVersion),
            ]);

            const uriFactory = mockByCalls.create<UriFactoryInterface>(UriFactoryDouble, [
                Call.create('createUri')
                    .with('https://localhost' + path)
                    .willReturn(uri),
            ]);

            const req = {
                ...({} as IncomingMessage),
                httpVersion: '1.1',
                method: 'get',
                url: path,
                headers: {},
                pipe: (destination: Duplex): Duplex => destination,
            } as IncomingMessage;

            const streamFactory = mockByCalls.create<StreamFactoryInterface>(StreamFactoryDouble, [
                Call.create('createStreamFromResource')
                    .with(req)
                    .willReturnCallback((req: Stream) => req.pipe(new PassThrough())),
            ]);

            const psrRequestFactory = new PsrRequestFactory(serverRequestFactory, uriFactory, streamFactory, {
                schema: 'https',
            });

            expect(psrRequestFactory.create(req)).toBe(serverRequest);

            expect(mockByCallsUsed(uri)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithProtocolVersion)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
            expect(mockByCallsUsed(streamFactory)).toBe(true);
        });
    });
});
