import { App } from '@tinyhttp/app';
import { Processor, IIIFError } from 'iiif-processor';
import fs from 'fs';
import path from 'path';
import { iiifImagePath, iiifpathPrefix, fileTemplate } from './config';

const streamImageFromFile = async ({ id }: { id: string }) => {
  const filename = fileTemplate.replace(/\{\{id\}\}/, id);
  const file = path.join(iiifImagePath, filename);
  if (!fs.existsSync(file)) {
    throw new IIIFError('Not Found', { statusCode: 404 });
  }
  return fs.createReadStream(file);
};


// import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

// async function streamResolver({ id, baseUrl }) {
//   const s3 = new S3Client();
//   const command = new GetObjectCommand({
//     Bucket: "my-tiff-bucket",
//     Key: `${id}.tif`
//   });
//   const response = await s3.send(command);
//   const body = response.Body;

//   if (!stream) {
//     throw new Error(`Could not fetch object from S3: ${id}`);
//   }

//   return stream;
// }

const render = async (req: any, res: any) => {
  if (req.params && req.params.filename == null) {
    req.params.filename = 'info.json';
  }

  const iiifUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  const iiifProcessor = new Processor(iiifUrl, streamImageFromFile, {
    pathPrefix: iiifpathPrefix,
    debugBorder: !!process.env.DEBUG_IIIF_BORDER
  });
  const result = await iiifProcessor.execute();
  return res
    .set('Content-Type', result.contentType)
    .set('Link', [`<${(result as any).canonicalLink}>;rel="canonical"`, `<${(result as any).profileLink}>;rel="profile"`])
    .status(200)
    .send(result.body);
};

function createRouter (version: number) {
  const router = new App();

  router.use((_req, res, next) => {
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Allow-Methods', 'OPTIONS, HEAD, GET, POST, PUT, DELETE');
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });

  router.options('*', (_req, res) => {
    res.status(204).send('');
  });
  router.get('/', (_req, res) => res.status(200).send(`IIIF v${version}.x endpoint OK`));
  router.get('/:id', render);
  router.get('/:id/info.json', render);
  router.get('/:id/:region/:size/:rotation/:filename', render);

  return router;
}

export default createRouter;
