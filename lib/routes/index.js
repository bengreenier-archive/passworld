const express = require('express')
const ensureAuthenticated = require('../middleware').ensureAuthenticated

let router = express.Router()

router.get('/', ensureAuthenticated, (req, response) => {
    response.render('index.html', {
        name: req.user.name
    })
})

module.exports = router