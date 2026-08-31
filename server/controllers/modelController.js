import modelService from '../services/modelService.js'

const handleList = (req, res) => {
    // The registry is a module constant, so it is safe to let the browser hold
    // onto it for the length of a session rather than refetch it per reload.
    res.set('Cache-Control', 'public, max-age=300')
    res.json(modelService.getRegistry())
}

export default { handleList }
