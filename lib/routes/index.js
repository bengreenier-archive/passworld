const express = require('express')

let router = express.Router()

router.get('/', (req, response) => {
    response.render('index.html', {
        name: req.user.name
    })
})

module.exports = router