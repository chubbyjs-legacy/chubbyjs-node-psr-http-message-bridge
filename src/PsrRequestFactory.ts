import ServerRequestFactoryInterface from '@chubbyjs/psr-http-factory/dist/ServerRequestFactoryInterface';
import StreamFactoryInterface from '@chubbyjs/psr-http-factory/dist/StreamFactoryInterface';
import UriFactoryInterface from '@chubbyjs/psr-http-factory/dist/UriFactoryInterface';
import { Method } from '@chubbyjs/psr-http-message/dist/RequestInterface';
import ServerRequestInterface, { QueryParams } from '@chubbyjs/psr-http-message/dist/ServerRequestInterface';
import { parse as cookieParser } from 'cookie';
import { IncomingMessage } from 'http';
import { parse as queryParser } from 'qs';

type UriOptions = { schema: 'http' | 'https'; host?: string } | boolean;

class PsrRequestFactory {
    public constructor(
        private serverRequestFactory: ServerRequestFactoryInterface,
        private uriFactory: UriFactoryInterface,
        private streamFactory: StreamFactoryInterface,
        private uriOptions: UriOptions = false,
    ) {}

    public create(req: IncomingMessage): ServerRequestInterface {
        if (!req.method) {
            throw new Error('Method missing');
        }

        const uri = this.uriFactory.createUri(this.getUri(req));

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
            .filter((entry) => entry[1])
            .forEach(([name, value]) => {
                serverRequest = serverRequest.withHeader(name, value as string[] | string);
            });

        return serverRequest;
    }

    private getUri(req: IncomingMessage): string {
        if (!req.url) {
            throw new Error('Url missing');
        }

        if (true === this.uriOptions) {
            const missingHeaders = ['x-forwarded-proto', 'x-forwarded-host', 'x-forwarded-port'].filter(
                (header) => !req.headers[header],
            );

            if (missingHeaders.length > 0) {
                throw new Error(`Missing "${missingHeaders.join('", "')}" header(s).`);
            }

            return (
                req.headers['x-forwarded-proto'] +
                '://' +
                req.headers['x-forwarded-host'] +
                ':' +
                req.headers['x-forwarded-port'] +
                req.url
            );
        }

        const schema = typeof this.uriOptions === 'object' ? this.uriOptions.schema : 'http';

        const host =
            typeof this.uriOptions === 'object' && this.uriOptions.host
                ? this.uriOptions.host
                : req.headers.host
                ? req.headers.host
                : 'localhost';

        return schema + '://' + host + req.url;
    }
}

export default PsrRequestFactory;
