import fs from 'node:fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { App } from '@tinyhttp/app'
import { iiifImagePath } from './config'
import { json } from 'milliparsec'

const MANIFEST_PATH = `${iiifImagePath}/manifests`

/*
Route                         HTTP Verb Description
-------------------------------------------------------------------------------------------
/manifests         GET       Get all manifests
/manifests         POST      Create a manifest - return manifest uri
/manifests/:mid    GET       Get manifest by id
/manifests/:mid    PUT       Update manifest with id
/manifests/:mid    DELETE    Delete manifest with id (currently not implemented)
-------------------------------------------------------------------------------------------
*/
const cleanPath = filePath => {
  return path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
}


const cleanManifestIdMiddleware = (req, res, next) => {
  req.params.mid = cleanPath(req.params.mid)
  next()
}

const getFullPathMiddleware = (req, res, next) => {
  req.fullManifestPath = path.resolve(MANIFEST_PATH, req.params.mid)

  if (!fs.existsSync(req.fullManifestPath)) {
    return res
      .status(404)
      .json({
        message: `Manifest '${req.params.mid}' does not exist`,
      })
  }

  next()
}

const formatManifestURI = (host, id) => {
  return `https://${host}/manifests/${id}`
}

// eslint-disable-next-line max-lines-per-function
export default async function createRouter() {
  const router = new App()

  
  router.use(await json({ payloadLimit: 50_000_000 /* 50 mb */ }))

  router
    .route('/')
    .get((req, res) => {
      const files = fs.readdirSync(MANIFEST_PATH)

      const manifests = files.map(filename => ({
        uri: formatManifestURI(req.headers.host, filename),
      }))

      res.json({ manifests })
    })
    // create a manifest
    .post((req, res) => {
      const id = randomUUID()
      const uri = formatManifestURI(req.headers.host, id)

      fs.writeFileSync(
        path.resolve(MANIFEST_PATH, id),
        JSON.stringify(req.body)
      )
      res.status(201).json({ uri })
    })

  router
    .route('/:mid')
    .all(cleanManifestIdMiddleware)
    .all(getFullPathMiddleware)
    // get manifest with id
    .get((req, res) => {
      const data = fs.readFileSync(req.fullManifestPath, 'utf8')
      res.json(JSON.parse(data))
    })
    // update an existing manifest with id
    .put((req, res) => {
      fs.writeFileSync(req.fullManifestPath, JSON.stringify(req.body))
      res.status(200).json({ message: 'Manifest successfully updated' })
    })
    // // delete an existing manifest with id
    // .delete((req, res) => {
    //   res
    //     .status(404)
    //     .json({ message: 'Deleting manifests is currently not supported' })
    // })

  return router
}