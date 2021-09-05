import ServerRequestFactoryInterface from '@chubbyjs/psr-http-factory/dist/ServerRequestFactoryInterface';
import StreamFactoryInterface from '@chubbyjs/psr-http-factory/dist/StreamFactoryInterface';
import UriFactoryInterface from '@chubbyjs/psr-http-factory/dist/UriFactoryInterface';
import { Method } from '@chubbyjs/psr-http-message/dist/RequestInterface';
import ServerRequestInterface, { QueryParams } from '@chubbyjs/psr-http-message/dist/ServerRequestInterface';
import { parse as cookieParser } from 'cookie';
import { IncomingMessage } from 'http';
import { parse as queryParser } from 'qs';

class PsrRequestFactory {
    public constructor(
        private serverRequestFactory: ServerRequestFactoryInterface,
        private uriFactory: UriFactoryInterface,
        private streamFactory: StreamFactoryInterface,
    ) {}

    public create(req: IncomingMessage): ServerRequestInterface {
        if (!req.method) {
            throw new Error('Method missing');
        }

        if (!req.url) {
            throw new Error('Url missing');
        }

        const uri = this.uriFactory.createUri('http://' + (req.headers.host ?? 'localhost') + req.url);

        let serverRequest = this.serverRequestFactory
            .createServerRequest(req.method.toUpperCase() as Method, uri)
            .withProtocolVersion(req.httpVersion)
            .withBody(this.streamFactory.createStreamFromResource(req));

        if (req.headers.cookie) {
            serverRequest = serverRequest.withCookieParams(new Map(Object.entries(cookieParser(req.headers.cookie))));
        }

        const query = uri.getQuery();

        if (query) {
            serverRequest = serverRequest.withQueryParams(queryParser(query) as QueryParams);
        }

        Object.entries(req.headers)
            .filter(([name, value]) => value)
            .forEach(([name, value]) => {
                serverRequest = serverRequest.withHeader(name, value as string[] | string);
            });

        return serverRequest;
    }
}

export default PsrRequestFactory;
