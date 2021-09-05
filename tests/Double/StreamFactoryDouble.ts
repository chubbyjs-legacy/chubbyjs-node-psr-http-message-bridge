import StreamFactoryInterface from '@chubbyjs/psr-http-factory/dist/StreamFactoryInterface';
import * as Stream from 'stream';
import { Duplex } from 'stream';

class StreamFactoryDouble implements StreamFactoryInterface {
    createStream(content: string): Duplex {
        throw new Error('Method not implemented.');
    }
    createStreamFromFile(filename: string): Duplex {
        throw new Error('Method not implemented.');
    }
    createStreamFromResource(stream: Stream): Duplex {
        throw new Error('Method not implemented.');
    }
}

export default StreamFactoryDouble;
