const kv = require('azure-keyvault')

module.exports = {
    // authentication helper
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next()
        res.redirect('/auth')
    },

    // keyvault client helper
    ensureKvExists: (req, res, next) => {
        req.kv.client = new kv.KeyVaultClient(new kv.KeyVaultCredentials((challenge, cb) => {
            return cb(null, `Bearer ${req.user.tokens.accessToken}`)
        }))
        next()
    }
}