const express = require('express')
const passport = require('passport')

let router = express.Router()

router.get('/',
    passport.authenticate('azuread-openidconnect', {failureRedirect: '/?failure=login', resourceURL: "https://vault.azure.net"}),
    (req, res) => {
        res.redirect('/')
})

router.post('/callback',
    passport.authenticate('azuread-openidconnect', {failureRedirect: '/auth/failure', successRedirect: '/', resourceURL: "https://vault.azure.net"}),
    (req, res) => {
        res.redirect('/')
})

router.get('/failure', (req, res) => {
    res.status(401).send("Oops! Auth is hard, something failed. Try <a href='/auth'>again</a>.")
})

module.exports = router