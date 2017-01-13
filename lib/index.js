const fs = require('fs')
const express = require('express')
const nunjucks = require('nunjucks')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const serveStatic = require('serve-static')
const passport = require('passport')
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy

// parse the secrets out of the runtime
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET
const redirectUri = process.env.REDIRECT_URI
const vaultUri = process.env.VAULT_URI
const identityUri = process.env.IDENTITY_URI || 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration'
const sessionSecret = process.env.SESSION_SECRET || "dontusedefaultvalues"
const port = process.env.PORT || 3001

// configure our RESTful app
const app = express()

// configure our view template engine
nunjucks.configure(__dirname + '/views', {
    autoescape: true,
    express: app
})

// use ../ to serve the <projectRoot>/public folder
app.use(serveStatic(__dirname + '/../public'))

// configure our generic middleware
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    resave: true,
    saveUninitialized: false,
    secret: sessionSecret
}))
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
    req.kv = {
        uris: [vaultUri]
    }
    next()
})

// configure our authentication middleware
const users = {}
passport.use(new OIDCStrategy({
    identityMetadata: identityUri,
    clientID: clientId,
    responseType: 'code id_token',
    responseMode: 'form_post',
    redirectUrl: redirectUri,
    clientSecret: clientSecret,
    allowHttpForRedirectUrl: redirectUri.indexOf("https") === -1
  }, (iss, sub, profile, accessToken, refreshToken, done) => {
    profile.tokens = {
        accessToken,
        refreshToken
    }
    if (!profile.oid) {
        return done(new Error("No oid found"), null)
    }
    return done(null, profile)
}))

passport.serializeUser(function(user, done) {
    users[user.oid] = user;
    done(null, user.oid);
});

passport.deserializeUser(function(oid, done) {
  done(null, users[oid])
})

// load our routes dynamically
const routePath = __dirname + '/routes'
fs.readdirSync(routePath).forEach((routeFile) => {
    // strip the .js
    routeFile = routeFile.substring(0, routeFile.length - ".js".length)

    // if file is index, use just '/' otherwise use '/file' 
    app.use(routeFile == 'index' ? '/' : `/${routeFile}`, require(`${routePath}/${routeFile}`))
})

// start our app
const server = app.listen(port, () => {
    console.log(`Listening on [${server.address().address}]:${server.address().port}`)
})
