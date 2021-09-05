import Call from '@chubbyjs/chubbyjs-mock/dist/Call';
import MockByCalls, { mockByCallsUsed } from '@chubbyjs/chubbyjs-mock/dist/MockByCalls';
import ResponseInterface from '@chubbyjs/psr-http-message/dist/ResponseInterface';
import { describe, expect, test } from '@jest/globals';
import { OutgoingHttpHeaders, ServerResponse } from 'http';
import { PassThrough } from 'stream';
import NodeResponseEmitter from '../src/NodeResponseEmitter';
import ResponseDouble from './Double/ResponseDouble';

const mockByCalls = new MockByCalls();

describe('NodeResponseEmitter', () => {
    describe('emit', () => {
        test('successful', () => {
            const response = mockByCalls.create<ResponseInterface>(ResponseDouble, [
                Call.create('getStatusCode').with().willReturn(404),
                Call.create('getReasonPhrase').with().willReturn('Not Found'),
                Call.create('getHeaders')
                    .with()
                    .willReturn(new Map([['Content-Type', ['application/json']]])),
                Call.create('getBody').with().willReturn(new PassThrough()),
            ]);

            let data = {
                statusCode: 0,
                statusMessage: '',
                headers: {},
                emitted: false,
            };

            // @ts-ignore
            const res = {
                writeHead: (statusCode: number, statusMessage: string, headers: OutgoingHttpHeaders) => {
                    data.statusCode = statusCode;
                    data.statusMessage = statusMessage;
                    data.headers = headers;
                },
                on: () => null,
                once: () => null,
                emit: () => {
                    data.emitted = true;
                },
            } as ServerResponse;

            const psrResponseEmitter = new NodeResponseEmitter();

            psrResponseEmitter.emit(response, res);

            expect(data).toEqual({
                statusCode: 404,
                statusMessage: 'Not Found',
                headers: {
                    'Content-Type': ['application/json'],
                },
                emitted: true,
            });

            expect(mockByCallsUsed(response)).toBe(true);
        });
    });
});
