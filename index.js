const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const passport = require('passport')
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy
const kv = require('azure-keyvault')

// parse the secrets out of the runtime
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = process.env.REDIRECT_URI
const identityScope = process.env.IDENTITY_SCOPE
const vaultUri = process.env.VAULT_URI
const identityUri = process.env.IDENTITY_URI || 'https://login.microsoftonline.com/common/.well-known/openid-configuration'
const sessionSecret = process.env.SESSION_SECRET || "awopetiaepgfr"
const port = process.env.PORT || 3001

// configure our keyvault client
const createKvClient = () => {
    return kvClient = new kv.KeyVaultClient(new kv.KeyVaultCredentials((challenge, cb) => {
        return cb(null, `${res.tokenType} ${res.accessToken}`)
    }))
}

// configure our RESTful app
const app = express()

app.use(cookieParser())
app.use(bodyParser.json())
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: sessionSecret
}))
app.use(passport.initialize())
app.use(passport.session())

// configure our authentication middleware
passport.use(new OIDCStrategy({
    identityMetadata: identityUri,
    clientID: clientId,
    responseType: 'code id_token',
    responseMode: 'query',
    redirectUrl: redirectUri,
    clientSecret: clientSecret,
    scope: identityScope
  }, (iss, sub, profile, accessToken, refreshToken, done) => {
    if (!profile.oid) {
        return done(new Error("No oid found"), null)
    }
    return done(null, profile)
}))

// start our app
const server = app.listen(port, () => {
    console.log(`Listening on [${server.address().address}]:${server.address().port}`)
})
