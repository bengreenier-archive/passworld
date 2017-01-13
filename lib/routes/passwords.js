const express = require('express')
const bodyParser = require('body-parser')
const Password = require('../models/password')
const ensureAuthenticated = require('../middleware').ensureAuthenticated
const ensureKvExists = require('../middleware').ensureKvExists

let router = express.Router()

router.get('/', ensureAuthenticated, ensureKvExists, (req, response) => {
    let vaultUri = req.kv.uris[0]
    req.kv.client.getSecrets(vaultUri, (err, res) => {
        if (err) return response.status(503).send(err)
        if (!res.length || res.length == 0) return response.send([])

        response.send(res.map((kvSecret) => {
            return new Password(kvSecret)
        }))
    })
})

router.get('/:name', ensureAuthenticated, ensureKvExists, (req, response) => {

    // TODO: support multiple vaults
    let vaultUri = req.kv.uris[0]
    req.kv.client.getSecret(vaultUri +  (vaultUri.endsWith('/') ? '' : '/') + `secrets/${req.params.name}`, (err, res) => {
        if (err) return response.status(503).send(err)

        response.send(new Password(res))
    })
})

router.delete('/:name', ensureAuthenticated, ensureKvExists, (req, response) => {
    let vaultUri = req.kv.uris[0]

    req.kv.client.deleteSecret(vaultUri, req.params.name, (err, res) => {
        if (err) return response.status(503).send(err)

        response.status(200).end()
    })
})

// takes an array of passwords
// {name: string, value: string, description: string, expiration: Date}
router.post('/', ensureAuthenticated, ensureKvExists, bodyParser.json(), (req, response) => {
    if (!req.body || !req.body.length || req.body.length < 1) return response.status(400).send({error: "malformed"})

    let vaultUri = req.kv.uris[0]

    let secretPromises = req.body.map((password) => {
        return [vaultUri].concat(new Password(
            password.name,
            password.value,
            password.description,
            password.expiration
        ).toKvArguments())
    }).map((args) => {
        return new Promise((resolve, reject) => {
            args.push((err, res) => {
                if (err) return reject(err)
                resolve(res)
            })
            req.kv.client.setSecret.apply(req.kv.client, args)
        })
    })

    Promise.all(secretPromises).then(() => {
        response.status(200).end()
    }, (err) => {
        response.status(503).send(err)
    })
})

module.exports = router