import modelService from '../services/modelService.js'

const handleList = (req, res) => {
    // Revalidate on every load so a model added to the registry shows up after
    // a server restart; Express's ETag turns unchanged fetches into a 304.
    res.set('Cache-Control', 'no-cache')
    res.json(modelService.getRegistry())
}

export default { handleList }
