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
        });

        test('successful minimal', () => {
            const path = '/path';

            const serverRequestWithBody = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withBody').with(new ArgumentInstanceOf(PassThrough)).willReturnSelf(),
            ]);

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn('')]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequest),
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

            psrRequestFactory.create(req);

            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
        });

        test('successful maximal', () => {
            const path = '/path';
            const query = 'key1[key11]=value11&key2[]=value21&key2[]=value22';
            const cookie = 'name=value; name2=value2; name3=value3';

            const serverRequestWithHeaderCookie = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withHeader').with('cookie', cookie).willReturnSelf(),
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

            const serverRequest = mockByCalls.create<ServerRequestInterface>(ServerRequestDouble, [
                Call.create('withProtocolVersion').with('1.1').willReturn(serverRequestWithBody),
            ]);

            const uri = mockByCalls.create<UriInterface>(UriDouble, [Call.create('getQuery').with().willReturn(query)]);

            const serverRequestFactory = mockByCalls.create<ServerRequestFactoryInterface>(ServerRequestFactoryDouble, [
                Call.create('createServerRequest').with('GET', uri).willReturn(serverRequest),
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

            psrRequestFactory.create(req);

            expect(mockByCallsUsed(serverRequestWithHeaderCookie)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithHeaderHost)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithQueryParams)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithCookieParams)).toBe(true);
            expect(mockByCallsUsed(serverRequestWithBody)).toBe(true);
            expect(mockByCallsUsed(serverRequest)).toBe(true);
            expect(mockByCallsUsed(serverRequestFactory)).toBe(true);
            expect(mockByCallsUsed(uriFactory)).toBe(true);
        });
    });
});
