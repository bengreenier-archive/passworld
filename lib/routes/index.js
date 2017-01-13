const express = require('express')
const Password = require('../models/password')
const ensureAuthenticated = require('../middleware').ensureAuthenticated
const ensureKvExists = require('../middleware').ensureKvExists

let router = express.Router()

router.get('/', ensureAuthenticated, ensureKvExists, (req, response) => {
    let vaultUri = req.kv.uris[0]
    req.kv.client.getSecrets(vaultUri, (err, res) => {
        if (err) return response.status(503).send(err)
        if (!res.length || res.length == 0) res = []

        response.render('index.html', {
            name: req.user.name,
            passwords: res.map((kvSecret) => {
                return new Password(kvSecret)
            })
        })
    })
    
})

module.exports = router