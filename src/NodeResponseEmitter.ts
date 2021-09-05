import ResponseInterface from '@chubbyjs/psr-http-message/dist/ResponseInterface';
import { ServerResponse } from 'http';

class NodeResponseEmitter {
    public emit(response: ResponseInterface, res: ServerResponse): void {
        res.writeHead(response.getStatusCode(), response.getReasonPhrase());

        response.getHeaders().forEach((value, name) => {
            res.setHeader(name, value);
        });

        response.getBody().pipe(res);
    }
}

export default NodeResponseEmitter;
